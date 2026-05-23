'use client';

import { type OrgMembership } from '@yapiops/auth/server';
import { type OrgRole } from '@yapiops/db/types';
import { cn } from '@yapiops/ui';
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutGrid,
  LineChart,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

type NavHref =
  | '/dashboard'
  | '/projects'
  | '/ek3pilot'
  | '/raporx'
  | '/spektrumhub'
  | '/copilot'
  | '/billing'
  | '/settings/organization'
  | '/settings/team'
  | '/settings/notifications'
  | '/settings/ek3-templates'
  | '/settings/audit';

interface NavItem {
  href: NavHref;
  labelKey: string;
  icon: typeof LayoutGrid;
  enabled?: boolean;
  /** undefined = tüm roller görür; aksi halde sadece listelenen roller. */
  roles?: OrgRole[];
}

const MODULE_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'common.appName', icon: LayoutGrid, enabled: true },
  { href: '/projects', labelKey: 'dashboard.modules.projects', icon: FolderOpen, enabled: true },
  { href: '/ek3pilot', labelKey: 'dashboard.modules.ek3pilot', icon: FileText, enabled: true },
  { href: '/raporx', labelKey: 'dashboard.modules.raporx', icon: LineChart, enabled: false },
  { href: '/spektrumhub', labelKey: 'dashboard.modules.spektrumhub', icon: Waves, enabled: false },
  { href: '/copilot', labelKey: 'dashboard.modules.copilot', icon: Sparkles, enabled: false },
  { href: '/billing', labelKey: 'dashboard.modules.billing', icon: CreditCard, enabled: true },
];

// Settings linkleri — role-aware. RLS backend'i zaten korur; bu sadece
// görünürlük (UX). audit/team/templates owner+admin; organization +
// notifications herkes.
const SETTINGS_ITEMS: NavItem[] = [
  { href: '/settings/organization', labelKey: 'nav.organization', icon: Building2, enabled: true },
  {
    href: '/settings/team',
    labelKey: 'nav.team',
    icon: Users,
    enabled: true,
    roles: ['owner', 'admin'],
  },
  {
    href: '/settings/ek3-templates',
    labelKey: 'nav.templates',
    icon: FileText,
    enabled: true,
    roles: ['owner', 'admin'],
  },
  { href: '/settings/notifications', labelKey: 'nav.notifications', icon: Bell, enabled: true },
  {
    href: '/settings/audit',
    labelKey: 'nav.audit',
    icon: ScrollText,
    enabled: true,
    roles: ['owner', 'admin'],
  },
];

export function DashboardSidebar({ membership }: { membership: OrgMembership }) {
  const t = useTranslations();
  const pathname = usePathname();

  const settingsItems = SETTINGS_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(membership.role),
  );

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-secondary text-secondary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          item.enabled === false && 'pointer-events-none opacity-50',
        )}
        aria-disabled={item.enabled === false}
      >
        <Icon className="h-4 w-4" />
        {t(item.labelKey)}
      </Link>
    );
  };

  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <Building2 className="h-5 w-5" />
        {t('common.appName')}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {MODULE_ITEMS.map(renderItem)}

        <div className="px-3 pb-1 pt-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
            {t('nav.settings')}
          </div>
        </div>
        {settingsItems.map(renderItem)}
      </nav>
    </aside>
  );
}
