import { type OrgMembership } from '@yapiops/auth/server';
import { type ReactNode } from 'react';

import { PostHogIdentify } from '@/components/providers/posthog-identify';

import { DashboardHeader } from './dashboard-header';
import { DashboardSidebar } from './dashboard-sidebar';

interface DashboardShellProps {
  membership: OrgMembership;
  userAgent: string | null;
  children: ReactNode;
}

export function DashboardShell({ membership, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <PostHogIdentify orgId={membership.orgId} role={membership.role} />
      <DashboardSidebar membership={membership} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader membership={membership} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
