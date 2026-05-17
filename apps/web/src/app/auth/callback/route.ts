import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { provisionFirstLogin } from '@/lib/auth/provision';

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
    const headersList = await headers();
    await provisionFirstLogin({
      user: data.user,
      ipAddress: headersList.get('x-forwarded-for'),
      userAgent: headersList.get('user-agent'),
    });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
