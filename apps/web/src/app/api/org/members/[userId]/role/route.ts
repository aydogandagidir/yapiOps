import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({
  role: z.enum(['admin', 'engineer', 'auditor']),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
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
    return NextResponse.json({ error: 'cannot_change_self' }, { status: 400 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { error } = await supabase
    .from('users')
    .update({ role: parsed.data.role })
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
  await audit.log('org.role.changed', {
    resourceType: 'user',
    resourceId: userId,
    metadata: { new_role: parsed.data.role },
  });

  return NextResponse.json({ ok: true });
}
