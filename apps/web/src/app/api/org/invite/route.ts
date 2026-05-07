import crypto from 'node:crypto';

import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageSeats } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const requestSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'engineer', 'auditor']),
});

const INVITE_EXPIRY_DAYS = 7;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!canManageSeats(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const { error: inviteErr } = await supabase.from('org_invitations').insert({
    org_id: ctx.membership.orgId,
    email: parsed.data.email,
    role: parsed.data.role,
    token,
    invited_by: ctx.user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: (await headers()).get('x-forwarded-for'),
    userAgent: (await headers()).get('user-agent'),
  });
  await audit.log('org.member.invited', {
    resourceType: 'org_invitation',
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  // TODO: send email via Resend with the invitation link.
  // const inviteUrl = `${origin}/invitations/${token}`;
  // await resend.emails.send({...});

  return NextResponse.json({ ok: true, token });
}
