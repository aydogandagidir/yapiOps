import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canCreateProject } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { ProjectCreateSchema } from './_schema';

import { captureServerEvent, flushPostHog } from '@/lib/posthog-server';


export const runtime = 'nodejs';

interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  ada_no: string | null;
  parsel_no: string | null;
  il: string | null;
  ilce: string | null;
  toplam_alan_m2: number | null;
  zemin_ustu_kat_sayisi: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export async function GET() {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, org_id, name, ada_no, parsel_no, il, ilce, toplam_alan_m2, zemin_ustu_kat_sayisi, created_by, created_at, updated_at, archived_at',
    )
    .eq('org_id', ctx.membership.orgId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ projects: (data ?? []) });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!canCreateProject(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = ProjectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const { data: inserted, error } = await supabase
    .from('projects')
    .insert({
      ...parsed.data,
      org_id: ctx.membership.orgId,
      created_by: ctx.user.id,
    })
    .select()
    .single<ProjectRow>();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 500 });
  }

  const h = await headers();
  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
  await audit.log('project.created', {
    resourceType: 'project',
    resourceId: inserted.id,
    metadata: { name: inserted.name },
  });

  captureServerEvent({
    distinctId: ctx.membership.orgId,
    event: 'project_created',
    userId: ctx.user.id,
    properties: { projectId: inserted.id, role: ctx.membership.role },
  });
  await flushPostHog();

  return NextResponse.json({ project: inserted }, { status: 201 });
}
