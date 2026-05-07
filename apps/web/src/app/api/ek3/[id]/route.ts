import { type SupabaseClient } from '@supabase/supabase-js';
import { canDeleteEk3, canEditEk3 } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { Ek3PatchInputSchema } from '@yapiops/ek3';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { buildAuditContext, getAuditLogger, mergeFormData, type Ek3Row } from '../_helpers';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadOwnedForm(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<Ek3Row | null> {
  const { data } = await supabase
    .from('ek3_forms')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle<Ek3Row>();
  return data;
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
  const row = await loadOwnedForm(supabase, ctx.membership.orgId, id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ek3Form: row });
}

export async function PATCH(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const row = await loadOwnedForm(supabase, ctx.membership.orgId, id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ownsForm = row.created_by === ctx.user.id;
  if (!canEditEk3(ctx.membership.role, ownsForm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (row.status === 'signed' || row.status === 'superseded') {
    return NextResponse.json({ error: 'immutable_status' }, { status: 409 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = Ek3PatchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const merged = mergeFormData(row.form_data, parsed.data.formData);

  const { data: updated, error } = await supabase
    .from('ek3_forms')
    .update({ form_data: merged })
    .eq('id', id)
    .select()
    .single<Ek3Row>();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'update_failed' }, { status: 500 });
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.updated', {
    resourceType: 'ek3_form',
    resourceId: updated.id,
    metadata: { stepsTouched: Object.keys(parsed.data.formData) },
  });

  return NextResponse.json({ ek3Form: updated });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const row = await loadOwnedForm(supabase, ctx.membership.orgId, id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ownsForm = row.created_by === ctx.user.id;
  if (!canDeleteEk3(ctx.membership.role, ownsForm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (row.status === 'signed') {
    return NextResponse.json({ error: 'cannot_delete_signed' }, { status: 409 });
  }

  const { error } = await supabase.from('ek3_forms').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.deleted', {
    resourceType: 'ek3_form',
    resourceId: id,
    metadata: { previousStatus: row.status, version: row.version },
  });

  return NextResponse.json({ ok: true });
}
