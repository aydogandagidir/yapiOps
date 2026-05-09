'use client';

import { type OrgMembership } from '@yapiops/auth/server';
import { createSupabaseBrowserClient } from '@yapiops/db/client';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

export function DashboardHeader({ membership }: { membership: OrgMembership }) {
  const router = useRouter();
  const t = useTranslations('common');

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="text-sm">
        <span className="text-muted-foreground">{membership.fullName ?? ''}</span>
        <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs uppercase">
          {membership.role}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        {t('logout')}
      </Button>
    </header>
  );
}
