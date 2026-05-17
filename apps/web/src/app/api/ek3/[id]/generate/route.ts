import { promises as fs } from 'node:fs';
import path from 'node:path';

import * as Sentry from '@sentry/nextjs';
import { type SupabaseClient } from '@supabase/supabase-js';
import { canEditEk3 } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { checkQuota, recordUsage } from '@yapiops/billing/quota';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { Ek3FormDataSchema } from '@yapiops/ek3';
import { downloadActiveTemplateBytes } from '@yapiops/ek3/template-source';
import { sendEk3GeneratedEmail } from '@yapiops/notifications';
import { renderEk3Pdf } from '@yapiops/pdf';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { buildAuditContext, getAuditLogger, type Ek3Row } from '../../_helpers';

import { captureServerEvent, flushPostHog } from '@/lib/posthog-server';
import { breadcrumbEk3 } from '@/lib/sentry-helpers';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PUBLIC_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'ek3-resmi-form.pdf');
const STORAGE_BUCKET = 'ek3-pdfs';

interface ResolvedTemplate {
  bytes: Uint8Array;
  source: 'db_active' | 'public_file' | 'none';
  templateId?: string;
  sha256?: string;
}

/**
 * Şablon çözümleme önceliği:
 *   1. `ek3_templates.is_active` satırı varsa → Storage'tan indir (canlı sync
 *      veya admin upload sonucu)
 *   2. `apps/web/public/templates/ek3-resmi-form.pdf` (eski path; geriye dönük
 *      uyumluluk için tutuldu)
 *   3. Yok → renderer HTML-fallback'e düşer
 */
async function resolveTemplate(supabase: SupabaseClient): Promise<ResolvedTemplate> {
  const dbResult = await downloadActiveTemplateBytes(supabase);
  if (dbResult) {
    return {
      bytes: dbResult.bytes,
      source: 'db_active',
      templateId: dbResult.row.id,
      sha256: dbResult.row.sha256,
    };
  }
  try {
    const buf = await fs.readFile(PUBLIC_TEMPLATE_PATH);
    return { bytes: new Uint8Array(buf), source: 'public_file' };
  } catch {
    return { bytes: new Uint8Array(), source: 'none' };
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
    breadcrumbEk3({
      action: 'quota_exceeded',
      orgId: ctx.membership.orgId,
      resourceId: id,
      data: { used: quota.used, limit: quota.limit, reason: quota.reason },
    });
    captureServerEvent({
      distinctId: ctx.membership.orgId,
      event: 'quota_exceeded',
      userId: ctx.user.id,
      properties: {
        feature: 'ek3Generations',
        used: quota.used,
        limit: quota.limit,
        reason: quota.reason,
      },
    });
    await flushPostHog();
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

  const template = await resolveTemplate(supabase);
  const rendered = await renderEk3Pdf({
    form: parsed.data,
    templateBytes: template.source === 'none' ? null : template.bytes,
  });

  // Upload to Supabase Storage.
  const storagePath = `${ctx.membership.orgId}/${row.project_id}/${id}.pdf`;
  const upload = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, rendered.bytes, {
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
      metadata: {
        strategy: rendered.strategy,
        version: row.version,
        templateSource: template.source,
        templateId: template.templateId ?? null,
        templateSha256: template.sha256 ?? null,
      },
    });
  } catch {
    // swallowed intentionally — see comment above
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.generated', {
    resourceType: 'ek3_form',
    resourceId: id,
    metadata: {
      pdfUrl: publicUrl,
      strategy: rendered.strategy,
      version: row.version,
      templateSource: template.source,
      templateId: template.templateId ?? null,
    },
  });

  breadcrumbEk3({
    action: 'generated',
    orgId: ctx.membership.orgId,
    resourceId: id,
    data: {
      strategy: rendered.strategy,
      templateSource: template.source,
      version: row.version,
    },
  });
  captureServerEvent({
    distinctId: ctx.membership.orgId,
    event: 'ek3_generated',
    userId: ctx.user.id,
    properties: {
      ek3FormId: id,
      version: row.version,
      strategy: rendered.strategy,
      templateSource: template.source,
      role: ctx.membership.role,
    },
  });
  await flushPostHog();

  // E-posta bildirimi (fail-tolerant) — kullanıcı opt-out etmediyse gönder.
  void sendEk3GeneratedNotification({
    supabase,
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    userEmail: ctx.user.email ?? null,
    fullName: ctx.membership.fullName,
    projectId: row.project_id,
    ek3Version: row.version,
    pdfUrl: publicUrl,
  });

  return NextResponse.json({
    ek3Form: updated,
    pdfUrl: publicUrl,
    strategy: rendered.strategy,
  });
}

interface NotificationInput {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
  userEmail: string | null;
  fullName: string | null;
  projectId: string;
  ek3Version: number;
  pdfUrl: string;
}

/**
 * Background-style fire-and-forget email gönderimi. PDF üretimini bloklamaz;
 * her hata Sentry'ye düşer. Kullanıcı `preferences.email_ek3_generated`
 * false ise hiç gönderilmez.
 */
async function sendEk3GeneratedNotification(input: NotificationInput): Promise<void> {
  try {
    if (!input.userEmail) return;
    const { data: prefs } = await input.supabase
      .from('users')
      .select('preferences')
      .eq('id', input.userId)
      .maybeSingle<{ preferences: Record<string, unknown> | null }>();
    const optedIn = (prefs?.preferences as { email_ek3_generated?: boolean } | null | undefined)
      ?.email_ek3_generated;
    if (optedIn === false) return;

    const { data: project } = await input.supabase
      .from('projects')
      .select('name')
      .eq('id', input.projectId)
      .maybeSingle<{ name: string }>();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yapiops.com';
    await sendEk3GeneratedEmail({
      to: input.userEmail,
      locale: 'tr', // TODO: kullanıcı locale tercihi 0006 migration'da gelecek
      recipientName: input.fullName ?? input.userEmail,
      projectName: project?.name ?? 'Proje',
      ek3Version: input.ek3Version,
      pdfUrl: input.pdfUrl,
      appUrl,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'notifications', kind: 'ek3_generated_email' },
      extra: { orgId: input.orgId, userId: input.userId },
    });
  }
}
