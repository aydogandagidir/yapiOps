import { AuditLogger } from '@yapiops/audit';
import { startTrial } from '@yapiops/billing';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';


/**
 * Supabase OAuth/email-verification callback.
 *
 * 1. Exchange the `?code=` for a session (sets cookies).
 * 2. If this is the user's first login (no `users` row yet), create the
 *    organization, the `users` row with role=owner, and start the 14-day
 *    trial subscription.
 * 3. Redirect to /dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message ?? 'session_failed')}`, url.origin),
    );
  }

  // Check if user has a row yet.
  const { data: existing } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('id', data.user.id)
    .maybeSingle<{ id: string; org_id: string }>();

  if (!existing) {
    await provisionFirstLogin({
      userId: data.user.id,
      email: data.user.email ?? '',
      fullName: (data.user.user_metadata.full_name as string | undefined) ?? null,
      orgName:
        (data.user.user_metadata.org_name as string | undefined) ?? data.user.email ?? 'My Office',
      ipAddress: (await headers()).get('x-forwarded-for'),
      userAgent: (await headers()).get('user-agent'),
    });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

async function provisionFirstLogin(input: {
  userId: string;
  email: string;
  fullName: string | null;
  orgName: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  // Use the service client to bypass RLS for the initial bootstrap insert.
  const service = createSupabaseServiceClient();

  const slug = slugify(input.orgName) + '-' + input.userId.slice(0, 8);

  const { data: org, error: orgErr } = await service
    .from('organizations')
    .insert({
      name: input.orgName,
      slug,
      subscription_tier: 'free',
      seat_count: 1,
    })
    .select('id')
    .single<{ id: string }>();

  if (orgErr || !org) {
    throw new Error(`Failed to create organization: ${orgErr?.message ?? 'unknown'}`);
  }

  const { error: userErr } = await service.from('users').insert({
    id: input.userId,
    org_id: org.id,
    email: input.email,
    full_name: input.fullName,
    role: 'owner',
  });

  if (userErr) {
    throw new Error(`Failed to create user row: ${userErr.message}`);
  }

  // The service client's generic shape doesn't structurally match the SDK's
  // default SupabaseClient<...> tuple — they're identical at runtime since
  // Database = any in Phase 0. Cast through `unknown` to satisfy the contract.
  const supabaseForLib = service as unknown as Parameters<typeof startTrial>[0];

  await startTrial(supabaseForLib, org.id);

  const audit = new AuditLogger(supabaseForLib, {
    orgId: org.id,
    userId: input.userId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await audit.log('org.created', { resourceType: 'organization', resourceId: org.id });
  await audit.log('subscription.created', {
    resourceType: 'subscription',
    metadata: { plan_code: 'free', trial: true },
  });
  await audit.log('login.success', { metadata: { first_login: true } });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
     
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}
