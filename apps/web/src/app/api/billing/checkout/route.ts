import { requireAuthContext } from '@yapiops/auth/server';
import { createCheckoutForm } from '@yapiops/billing';
import type { PlanCode } from '@yapiops/db';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const requestSchema = z.object({
  planCode: z.enum([
    'solo_monthly',
    'solo_yearly',
    'office_monthly',
    'office_yearly',
    'office_ai_monthly',
    'office_ai_yearly',
  ] as const),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const headersList = await headers();
  const host = headersList.get('host');
  const proto = headersList.get('x-forwarded-proto') ?? 'https';
  const callbackUrl = `${proto}://${host ?? 'yapiops.com'}/billing/checkout/success`;

  try {
    const result = await createCheckoutForm({
      orgId: ctx.membership.orgId,
      planCode: parsed.data.planCode satisfies PlanCode,
      customer: {
        id: ctx.user.id,
        name: ctx.membership.fullName?.split(' ')[0] ?? '',
        surname: ctx.membership.fullName?.split(' ').slice(1).join(' ') ?? '',
        email: ctx.user.email ?? '',
      },
      callbackUrl,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'checkout_failed' },
      { status: 500 },
    );
  }
}
