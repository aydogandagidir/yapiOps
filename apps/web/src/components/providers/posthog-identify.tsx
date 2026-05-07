'use client';

import { useEffect } from 'react';

import { posthog } from '@/lib/posthog';

interface Props {
  orgId: string;
  role: string;
}

/**
 * Cookie consent verildiyse PostHog'a `identify(orgId, { role })` çağırır.
 * Server-side capture'lar da org_id distinct id kullandığı için funnel
 * client + server arasında birleşik kalır.
 */
export function PostHogIdentify({ orgId, role }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const consent = window.localStorage.getItem('yapiops:cookie-consent');
    if (consent !== 'accepted') return;
    posthog.identify(orgId, { role });
  }, [orgId, role]);

  return null;
}
