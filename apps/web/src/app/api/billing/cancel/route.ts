import { AuditLogger } from '@yapiops/audit';
import { canEditBilling } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!canEditBilling(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = createSupabaseServerClient(cookieStore);

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('org_id', ctx.membership.orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (!sub) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 404 });
  }

  await supabase.from('subscriptions').update({ cancel_at_period_end: true }).eq('id', sub.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit = new AuditLogger(supabase as any, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
  });
  await audit.log('subscription.canceled', {
    resourceType: 'subscription',
    resourceId: sub.id,
    metadata: { cancel_at_period_end: true },
  });

  return NextResponse.json({ ok: true });
}
