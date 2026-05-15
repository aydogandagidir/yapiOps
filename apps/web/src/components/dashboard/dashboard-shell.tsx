import { type OrgMembership } from '@yapiops/auth/server';
import { type ReactNode } from 'react';

import { DashboardHeader } from './dashboard-header';
import { DashboardSidebar } from './dashboard-sidebar';

interface DashboardShellProps {
  membership: OrgMembership;
  userAgent: string | null;
  children: ReactNode;
}

/**
 * Dashboard layout shell. PostHogIdentify dashboard layout'undan render
 * ediliyor (subscription + session context'i orada) — shell'den ikinci kez
 * çağrılması duplicate identify ve TS error üretiyordu, kaldırıldı.
 */
export function DashboardShell({ membership, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <DashboardSidebar membership={membership} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader membership={membership} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
