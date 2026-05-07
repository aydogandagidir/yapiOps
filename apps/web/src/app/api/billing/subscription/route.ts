import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';


export async function GET() {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(cookieStore);

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', ctx.membership.orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('org_id', ctx.membership.orgId)
    .order('issued_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ subscription, invoices: invoices ?? [] });
}
