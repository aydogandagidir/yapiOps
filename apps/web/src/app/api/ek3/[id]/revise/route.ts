import { type SupabaseClient } from '@supabase/supabase-js';
import { canEditEk3 } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { Ek3ReviseInputSchema } from '@yapiops/ek3';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { captureServerEvent, flushPostHog } from '@/lib/posthog-server';

import { buildAuditContext, getAuditLogger, mergeFormData, type Ek3Row } from '../../_helpers';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: original } = await supabase
    .from('ek3_forms')
    .select('*')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<Ek3Row>();
  if (!original) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ownsForm = original.created_by === ctx.user.id;
  if (!canEditEk3(ctx.membership.role, ownsForm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (original.status === 'superseded') {
    return NextResponse.json({ error: 'already_superseded' }, { status: 409 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = Ek3ReviseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const newFormData = parsed.data.formData
    ? mergeFormData(original.form_data, parsed.data.formData)
    : original.form_data;

  // Insert the new version.
  const { data: revision, error: insErr } = await supabase
    .from('ek3_forms')
    .insert({
      project_id: original.project_id,
      org_id: original.org_id,
      version: original.version + 1,
      status: 'draft',
      form_data: newFormData,
      supersedes: original.id,
      revision_reason: parsed.data.revisionReason,
      created_by: ctx.user.id,
    })
    .select()
    .single<Ek3Row>();

  if (insErr || !revision) {
    return NextResponse.json({ error: insErr?.message ?? 'insert_failed' }, { status: 500 });
  }

  // Mark the original as superseded.
  const { error: updErr } = await supabase
    .from('ek3_forms')
    .update({ status: 'superseded', superseded_by: revision.id })
    .eq('id', original.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.revised', {
    resourceType: 'ek3_form',
    resourceId: revision.id,
    metadata: {
      originalId: original.id,
      previousVersion: original.version,
      newVersion: revision.version,
      reason: parsed.data.revisionReason,
    },
  });

  captureServerEvent({
    distinctId: ctx.membership.orgId,
    event: 'ek3_revised',
    userId: ctx.user.id,
    properties: {
      originalId: original.id,
      previousVersion: original.version,
      newVersion: revision.version,
      role: ctx.membership.role,
    },
  });
  await flushPostHog();

  return NextResponse.json({ ek3Form: revision }, { status: 201 });
}
