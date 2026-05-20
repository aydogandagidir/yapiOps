'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { posthog } from '@/lib/posthog';

const STORAGE_KEY = 'yapiops:cookie-consent';

export function CookieConsent() {
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
      aria-label="Çerez izni"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border bg-background p-4 shadow-lg md:p-6"
    >
      <p className="mb-3 text-sm">
        YapıOps, deneyiminizi geliştirmek için anonimleştirilmiş kullanım analitiği toplar (KVKK
        uyumlu, EU veri merkezinde saklanır). Pazarlama amaçlı çerez kullanmıyoruz.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={reject}>
          Reddet
        </Button>
        <Button size="sm" onClick={accept}>
          Kabul Et
        </Button>
      </div>
    </div>
  );
}
