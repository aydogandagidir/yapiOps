'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { posthog } from '@/lib/posthog';

const STORAGE_KEY = 'yapiops:cookie-consent';

export function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    posthog.opt_in_capturing();
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, 'rejected');
    posthog.opt_out_capturing();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('dialogLabel')}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border bg-background p-4 shadow-lg md:p-6"
    >
      <p className="mb-3 text-sm">{t('message')}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={reject}>
          {t('reject')}
        </Button>
        <Button size="sm" onClick={accept}>
          {t('accept')}
        </Button>
      </div>
    </div>
  );
}
