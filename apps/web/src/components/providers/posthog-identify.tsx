'use client';

import { useEffect } from 'react';

import { posthog } from '@/lib/posthog';

interface Props {
  orgId: string;
  userId: string;
  role: string;
  planCode?: string;
}

/**
 * Cookie consent verildiyse PostHog'a `identify(orgId, properties)` çağırır.
 * Server-side capture'lar da `distinct_id = org_id` kullandığı için funnel
 * client + server arasında birleşik kalır. user_id pseudonymized property
 * olarak gönderilir (KVKK uyumu: distinct_id seviyesinde org-level).
 */
export function PostHogIdentify({ orgId, userId, role, planCode }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const consent = window.localStorage.getItem('yapiops:cookie-consent');
    if (consent !== 'accepted') return;
    posthog.identify(orgId, {
      userId,
      role,
      ...(planCode ? { plan_code: planCode } : {}),
    });
  }, [orgId, userId, role, planCode]);

  return null;
}
