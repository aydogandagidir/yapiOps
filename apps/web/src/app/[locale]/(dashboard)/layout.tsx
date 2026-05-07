import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { type ReactNode } from 'react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { TrialBanner } from '@/components/dashboard/trial-banner';

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

  const membership = await getOrgMembership(cookieStore, session.user.id);
  if (!membership) {
    // User authenticated but no org row yet — re-run callback flow.
    redirect(`/${locale}/login?error=no_membership`);
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
