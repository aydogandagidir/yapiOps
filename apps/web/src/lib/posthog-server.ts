import 'server-only';

import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog client for ürün metrikleri.
 *
 * KVKK pragmatiği: distinct_id olarak `org_id` kullanılır (gerçek user_id
 * pseudonymized olarak `properties.userId` içinde gönderilir). Bu sayede
 * dashboard segmentasyonu org-level kalır; bireysel kullanıcı takibi PostHog
 * tarafında zorlaştırılır.
 *
 * Geliştirme/test ortamlarında `NEXT_PUBLIC_POSTHOG_KEY` boşsa tüm
 * `captureServerEvent` çağrıları no-op'a düşer — log gürültüsü olmaz.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

let client: PostHog | null = null;

function getServerPostHog(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (client) return client;
  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // Vercel serverless çağrılar kısa ömürlü; flushInterval'i kısa tut.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export interface CaptureEventInput {
  /** PostHog distinct_id — convention: org_id (KVKK-friendly). */
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  /** Optional user_id; gönderilirse `properties.userId` olarak kaydedilir. */
  userId?: string | null;
}

/**
 * Tek bir event yazar. Hata oluşursa sessizce yutar (Sentry'ye düşer ama
 * route handler bloklanmaz). Vercel serverless context'inde otomatik flush
 * için route sonunda `flushPostHog()` çağrılması önerilir.
 */
export function captureServerEvent(input: CaptureEventInput): void {
  const ph = getServerPostHog();
  if (!ph) return;
  try {
    ph.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties: {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.properties ?? {}),
      },
    });
  } catch {
    // Telemetry hataları request flow'unu bloklamaz.
  }
}

/**
 * Vercel serverless çağrılarında pending event'leri flush etmek için.
 * Route handler `finally` bloğunda await edilir.
 */
export async function flushPostHog(): Promise<void> {
  if (!client) return;
  try {
    await client.flush();
  } catch {
    // Flush hataları sessizce yutulur.
  }
}
