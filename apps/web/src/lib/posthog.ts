'use client';

import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

let initialized = false;

/**
 * Initializes PostHog with KVKK-compliant defaults: capturing is opted out
 * by default, so no events are sent until the user accepts the cookie banner.
 * Call `posthog.opt_in_capturing()` once consent is given.
 */
export function initPostHog(): typeof posthog | null {
  if (typeof window === 'undefined') return null;
  if (initialized) return posthog;
  if (!POSTHOG_KEY) return null;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,
    opt_out_capturing_by_default: true,
    persistence: 'localStorage',
    loaded: (instance) => {
      initialized = true;
      const consent = localStorage.getItem('yapiops:cookie-consent');
      if (consent === 'accepted') {
        instance.opt_in_capturing();
      }
    },
  });

  return posthog;
}

export { posthog };
