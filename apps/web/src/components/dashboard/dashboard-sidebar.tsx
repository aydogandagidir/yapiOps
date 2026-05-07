'use client';

import { type OrgMembership } from '@yapiops/auth/server';
import { cn } from '@yapiops/ui';
import {
  Building2,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutGrid,
  LineChart,
  Sparkles,
  Waves,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

interface NavItem {
  href:
    | '/dashboard'
    | '/projects'
    | '/ek3pilot'
    | '/raporx'
    | '/spektrumhub'
    | '/copilot'
    | '/billing';
  labelKey: string;
  icon: typeof LayoutGrid;
  enabled: boolean;
}

export function DashboardSidebar({ membership: _membership }: { membership: OrgMembership }) {
  const t = useTranslations();
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/dashboard', labelKey: 'common.appName', icon: LayoutGrid, enabled: true },
    { href: '/projects', labelKey: 'dashboard.modules.projects', icon: FolderOpen, enabled: true },
    { href: '/ek3pilot', labelKey: 'dashboard.modules.ek3pilot', icon: FileText, enabled: true },
    { href: '/raporx', labelKey: 'dashboard.modules.raporx', icon: LineChart, enabled: false },
    { href: '/spektrumhub', labelKey: 'dashboard.modules.spektrumhub', icon: Waves, enabled: false },
    { href: '/copilot', labelKey: 'dashboard.modules.copilot', icon: Sparkles, enabled: false },
    { href: '/billing', labelKey: 'dashboard.modules.billing', icon: CreditCard, enabled: true },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <Building2 className="h-5 w-5" />
        {t('common.appName')}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
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
                !item.enabled && 'pointer-events-none opacity-50',
              )}
              aria-disabled={!item.enabled}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
