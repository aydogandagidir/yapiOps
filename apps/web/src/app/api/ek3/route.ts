import { type SupabaseClient } from '@supabase/supabase-js';
import { canCreateEk3 } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { Ek3CreateInputSchema } from '@yapiops/ek3';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { captureServerEvent, flushPostHog } from '@/lib/posthog-server';
import { breadcrumbEk3 } from '@/lib/sentry-helpers';

import { buildAuditContext, getAuditLogger, type Ek3Row } from './_helpers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const status = url.searchParams.get('status');

  let q = supabase
    .from('ek3_forms')
    .select('id, project_id, version, status, form_data, pdf_url, generated_at, supersedes, superseded_by, revision_reason, created_by, created_at, updated_at')
    .eq('org_id', ctx.membership.orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (projectId) q = q.eq('project_id', projectId);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ek3Forms: data ?? [] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!canCreateEk3(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = Ek3CreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  // Verify the project exists in the same org (RLS already filters but we want a clear 404).
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', parsed.data.projectId)
    .maybeSingle<{ id: string; org_id: string }>();

  if (!project) {
    return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
  }
  if (project.org_id !== ctx.membership.orgId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: inserted, error } = await supabase
    .from('ek3_forms')
    .insert({
      project_id: parsed.data.projectId,
      org_id: ctx.membership.orgId,
      version: 1,
      status: 'draft',
      form_data: parsed.data.formData ?? {},
      created_by: ctx.user.id,
    })
    .select()
    .single<Ek3Row>();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 500 });
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.created', {
    resourceType: 'ek3_form',
    resourceId: inserted.id,
    metadata: { projectId: inserted.project_id, version: inserted.version },
  });

  breadcrumbEk3({
    action: 'created',
    orgId: ctx.membership.orgId,
    resourceId: inserted.id,
    data: { projectId: inserted.project_id },
  });
  captureServerEvent({
    distinctId: ctx.membership.orgId,
    event: 'ek3_created',
    userId: ctx.user.id,
    properties: {
      projectId: inserted.project_id,
      version: inserted.version,
      role: ctx.membership.role,
    },
  });
  await flushPostHog();

  return NextResponse.json({ ek3Form: inserted }, { status: 201 });
}
