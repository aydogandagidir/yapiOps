'use client';

import { cn } from '@yapiops/ui';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

const WARNING_THRESHOLD_DAYS = 3;

export function TrialBanner({ trialEnd }: { trialEnd: Date }) {
  const t = useTranslations();
  const daysLeft = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  // 3 katmanlı ton: bilgi (>3 gün) → uyarı (1-3 gün) → kritik (0 gün).
  // Renkler shadcn token'larından — primary/warning/destructive.
  const tone =
    daysLeft === 0 ? 'expired' : daysLeft <= WARNING_THRESHOLD_DAYS ? 'warning' : 'normal';

  const message =
    tone === 'expired'
      ? t('dashboard.trialBannerExpired')
      : tone === 'warning'
        ? t('dashboard.trialBannerWarning', { daysLeft })
        : t('dashboard.trialBanner', { daysLeft });

  return (
    <Link
      href="/billing"
      className={cn(
        'mb-6 flex items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors',
        tone === 'normal' && 'border-primary/20 bg-primary/5 hover:bg-primary/10',
        tone === 'warning' &&
          'border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-200',
        tone === 'expired' &&
          'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20',
      )}
    >
      {tone === 'normal' ? (
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <AlertTriangle
          className={cn(
            'h-4 w-4 shrink-0',
            tone === 'warning' && 'text-amber-600 dark:text-amber-400',
            tone === 'expired' && 'text-destructive',
          )}
        />
      )}
      <span>{message}</span>
    </Link>
  );
}
