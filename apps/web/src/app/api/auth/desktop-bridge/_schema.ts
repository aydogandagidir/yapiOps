import { z } from 'zod';

/**
 * Bridge cloud-side endpoint'lerinin Zod şemaları.
 *
 * Refresh akışı: Bridge `refresh_token`'ını gönderir, cloud Supabase service
 * client ile yeni access_token + refresh_token döndürür. Token rotasyonu
 * Supabase tarafında otomatik yapılır.
 */

export const BridgeRefreshSchema = z.object({
  refresh_token: z.string().min(20).max(2048),
});

export type BridgeRefreshInput = z.infer<typeof BridgeRefreshSchema>;

/**
 * Bridge → cloud login akışında query string'inden gelen parametreler.
 * `redirect_uri` Bridge'in localhost listener'ı (sabit `http://localhost:53682/callback`).
 * `state` Bridge'in PKCE-style CSRF token'ı; cloud yansıtır, Bridge eşleştirir.
 */
export const BridgeStartParamsSchema = z.object({
  redirect_uri: z
    .string()
    .url()
    .refine(
      (url) =>
        url.startsWith('http://localhost:53682/') ||
        url.startsWith('yapiops-bridge://'),
      'redirect_uri loopback (localhost:53682) veya custom protokol olmalı',
    ),
  state: z.string().min(8).max(128),
});

export type BridgeStartParams = z.infer<typeof BridgeStartParamsSchema>;
