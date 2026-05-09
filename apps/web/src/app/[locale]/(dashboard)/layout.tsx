import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { type ReactNode } from 'react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { TrialBanner } from '@/components/dashboard/trial-banner';
import { provisionFirstLogin } from '@/lib/auth/provision';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const session = await getServerSession(cookieStore);
  if (!session) {
    redirect(`/${locale}/login`);
  }

  let membership = await getOrgMembership(cookieStore, session.user.id);
  if (!membership) {
    // Self-heal: auth.users row exists but public.users does not — usually
    // because the email-confirmation callback was interrupted (wrong Site
    // URL, 404, etc). Run the same provisioning the callback would have.
    const headersList = await headers();
    try {
      await provisionFirstLogin({
        user: session.user,
        ipAddress: headersList.get('x-forwarded-for'),
        userAgent: headersList.get('user-agent'),
      });
      membership = await getOrgMembership(cookieStore, session.user.id);
    } catch (err) {
      // Vercel runtime log truncates raw Error objects ("[dashboard/layout]
      // provisio..."). Stringify a JSON detail so the full message + name +
      // first stack frames survive the log pipeline.
      const detail =
        err instanceof Error
          ? {
              message: err.message,
              name: err.name,
              stack: err.stack?.split('\n').slice(0, 6).join(' | '),
            }
          : { message: String(err) };
      console.error(
        '[dashboard/layout] provisionFirstLogin self-heal failed',
        JSON.stringify(detail),
      );
    }
    if (!membership) {
      redirect(`/${locale}/login?error=provision_failed`);
    }
  }

  const supabase = createSupabaseServerClient(cookieStore);
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_end, plan_code')
    .eq('org_id', membership.orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string; trial_end: string | null; plan_code: string }>();

  const userAgent = (await headers()).get('user-agent');

  return (
    <DashboardShell membership={membership} userAgent={userAgent}>
      {subscription?.status === 'trialing' && subscription.trial_end ? (
        <TrialBanner trialEnd={new Date(subscription.trial_end)} />
      ) : null}
      {children}
    </DashboardShell>
  );
}
