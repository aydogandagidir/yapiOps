'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export function TrialBanner({ trialEnd }: { trialEnd: Date }) {
  const t = useTranslations();
  const daysLeft = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Link
      href="/billing"
      className="mb-6 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
    >
      <Sparkles className="h-4 w-4 text-primary" />
      {t('dashboard.trialBanner', { daysLeft })}
    </Link>
  );
}
