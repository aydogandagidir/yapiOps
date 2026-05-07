import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
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

  if (userId === ctx.user.id) {
    return NextResponse.json({ error: 'cannot_remove_self' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  // Owners cannot be removed via this endpoint.
  const { data: target } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<{ role: string }>();

  if (target?.role === 'owner') {
    return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('org_id', ctx.membership.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: (await headers()).get('x-forwarded-for'),
  });
  await audit.log('org.member.removed', {
    resourceType: 'user',
    resourceId: userId,
  });

  return NextResponse.json({ ok: true });
}
