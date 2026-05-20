import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canCreateProject, canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { ProjectUpdateSchema } from '../_schema';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  archived_at: string | null;
  created_by: string | null;
}

export async function GET(_req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: existing } = await supabase
    .from('projects')
    .select('id, org_id, archived_at, created_by')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<ProjectRow>();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.archived_at) {
    return NextResponse.json({ error: 'archived' }, { status: 409 });
  }

  // Engineer can only edit projects they created.
  if (ctx.membership.role === 'engineer' && existing.created_by !== ctx.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = ProjectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const h = await headers();
  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
  await audit.log('project.updated', {
    resourceType: 'project',
    resourceId: id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return NextResponse.json({ project: updated });
}

/**
 * Soft delete via `archived_at`. Hard delete kapsam dışı — RLS ve audit
 * trail mühendislik sorumluluğu için kritik (CLAUDE.md §9.2).
 */
export async function DELETE(_req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!canManageOrg(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: existing } = await supabase
    .from('projects')
    .select('id, org_id, archived_at')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<ProjectRow>();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const h = await headers();
  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
  await audit.log('project.archived', {
    resourceType: 'project',
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
