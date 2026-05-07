'use client';

import { useEffect, type ReactNode } from 'react';

import { initPostHog } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}
