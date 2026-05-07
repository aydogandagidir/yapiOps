import crypto from 'node:crypto';

import { z } from 'zod';

/**
 * Iyzico webhook event schema. Iyzico signs the JSON payload with HMAC-SHA256
 * using the merchant's secret key, encodes the signature in base64, and sends
 * it in the `X-IYZICO-SIGNATURE` header.
 *
 * Reference: docs-internal/modules/billing.md §3.3
 */

export const iyzicoEventTypeSchema = z.enum([
  'subscription.payment_succeeded',
  'subscription.payment_failed',
  'subscription.created',
  'subscription.canceled',
  'subscription.trial_ending',
]);

export type IyzicoEventType = z.infer<typeof iyzicoEventTypeSchema>;

export const iyzicoWebhookEventSchema = z.object({
  event: iyzicoEventTypeSchema,
  iyzicoReferenceCode: z.string(),
  iyzicoSubscriptionReferenceCode: z.string().optional(),
  iyzicoPaymentId: z.string().optional(),
  paidPrice: z.number().optional(),
  currency: z.string().optional(),
  customerReferenceCode: z.string().optional(),
  occurredAt: z.string(),
});

export type IyzicoWebhookEvent = z.infer<typeof iyzicoWebhookEventSchema>;

/**
 * Constant-time HMAC-SHA256 signature verification. Returns `true` only if
 * the provided signature matches what we'd compute over the raw payload
 * with the merchant's secret key.
 *
 * NEVER skip this in a webhook handler — Iyzico's webhook URL is public.
 */
export function verifyIyzicoSignature(
  rawPayload: string,
  signatureHeader: string | null,
  secretKey: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(rawPayload, 'utf8')
    .digest('base64');

  // crypto.timingSafeEqual requires equal-length buffers.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/**
 * Parses and validates a webhook payload. Throws if the JSON is invalid or
 * doesn't match the expected schema.
 */
export function parseIyzicoEvent(rawPayload: string): IyzicoWebhookEvent {
  const json: unknown = JSON.parse(rawPayload);
  return iyzicoWebhookEventSchema.parse(json);
}
