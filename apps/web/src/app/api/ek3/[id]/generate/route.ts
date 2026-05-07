import { promises as fs } from 'node:fs';
import path from 'node:path';

import { type SupabaseClient } from '@supabase/supabase-js';
import { canEditEk3 } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { checkQuota, recordUsage } from '@yapiops/billing/quota';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { Ek3FormDataSchema } from '@yapiops/ek3';
import { renderEk3Pdf } from '@yapiops/pdf';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { buildAuditContext, getAuditLogger, type Ek3Row } from '../../_helpers';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'ek3-resmi-form.pdf');
const STORAGE_BUCKET = 'ek3-pdfs';

async function loadTemplate(): Promise<Uint8Array | null> {
  try {
    const buf = await fs.readFile(TEMPLATE_PATH);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function POST(_req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: row } = await supabase
    .from('ek3_forms')
    .select('*')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<Ek3Row>();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ownsForm = row.created_by === ctx.user.id;
  if (!canEditEk3(ctx.membership.role, ownsForm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (row.status === 'signed' || row.status === 'superseded') {
    return NextResponse.json({ error: 'immutable_status' }, { status: 409 });
  }

  const parsed = Ek3FormDataSchema.safeParse(row.form_data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'incomplete_form', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // Quota check (Free plan: 3/month).
  const quota = await checkQuota(supabase, ctx.membership.orgId, 'ek3Generations');
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        feature: 'ek3Generations',
        used: quota.used,
        limit: quota.limit,
        reason: quota.reason,
      },
      { status: 402 },
    );
  }

  const template = await loadTemplate();
  const rendered = await renderEk3Pdf({ form: parsed.data, templateBytes: template });

  // Upload to Supabase Storage.
  const storagePath = `${ctx.membership.orgId}/${row.project_id}/${id}.pdf`;
  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, rendered.bytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  const generatedAt = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from('ek3_forms')
    .update({
      status: 'completed',
      pdf_url: publicUrl,
      generated_at: generatedAt,
    })
    .eq('id', id)
    .select()
    .single<Ek3Row>();

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message ?? 'update_failed' }, { status: 500 });
  }

  // Best-effort: record usage and audit. We do NOT fail the response if these
  // fail — the PDF is already generated and uploaded. Sentry will pick up the
  // throw via the global error handler.
  try {
    await recordUsage(supabase, {
      orgId: ctx.membership.orgId,
      userId: ctx.user.id,
      feature: 'ek3.generated',
      resourceId: id,
      metadata: { strategy: rendered.strategy, version: row.version },
    });
  } catch {
    // swallowed intentionally — see comment above
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.generated', {
    resourceType: 'ek3_form',
    resourceId: id,
    metadata: { pdfUrl: publicUrl, strategy: rendered.strategy, version: row.version },
  });

  return NextResponse.json({
    ek3Form: updated,
    pdfUrl: publicUrl,
    strategy: rendered.strategy,
  });
}
