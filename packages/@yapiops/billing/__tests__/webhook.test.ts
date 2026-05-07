import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parseIyzicoEvent, verifyIyzicoSignature } from '../src/iyzico/webhook';

const SECRET = 'test-secret-key';

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload, 'utf8').digest('base64');
}

describe('verifyIyzicoSignature', () => {
  const validPayload = JSON.stringify({
    event: 'subscription.payment_succeeded',
    iyzicoReferenceCode: 'iyz-123',
    occurredAt: '2026-05-06T10:00:00Z',
  });

  it('accepts a correctly signed payload', () => {
    const sig = sign(validPayload);
    expect(verifyIyzicoSignature(validPayload, sig, SECRET)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const sig = sign(validPayload);
    const tampered = validPayload.replace('iyz-123', 'iyz-EVIL');
    expect(verifyIyzicoSignature(tampered, sig, SECRET)).toBe(false);
  });

  it('rejects a wrong-key signature', () => {
    const sig = crypto.createHmac('sha256', 'WRONG-KEY').update(validPayload).digest('base64');
    expect(verifyIyzicoSignature(validPayload, sig, SECRET)).toBe(false);
  });

  it('rejects null signature header', () => {
    expect(verifyIyzicoSignature(validPayload, null, SECRET)).toBe(false);
  });

  it('rejects empty signature header', () => {
    expect(verifyIyzicoSignature(validPayload, '', SECRET)).toBe(false);
  });

  it('rejects mismatched-length signature without throwing', () => {
    expect(verifyIyzicoSignature(validPayload, 'short', SECRET)).toBe(false);
  });
});

describe('parseIyzicoEvent', () => {
  it('parses a payment_succeeded event', () => {
    const payload = JSON.stringify({
      event: 'subscription.payment_succeeded',
      iyzicoReferenceCode: 'iyz-1',
      iyzicoSubscriptionReferenceCode: 'sub-1',
      iyzicoPaymentId: 'pay-1',
      paidPrice: 1500,
      currency: 'TRY',
      customerReferenceCode: 'cust-1',
      occurredAt: '2026-05-06T10:00:00Z',
    });
    const event = parseIyzicoEvent(payload);
    expect(event.event).toBe('subscription.payment_succeeded');
    expect(event.paidPrice).toBe(1500);
  });

  it('parses a canceled event with minimum fields', () => {
    const payload = JSON.stringify({
      event: 'subscription.canceled',
      iyzicoReferenceCode: 'iyz-2',
      occurredAt: '2026-05-06T10:00:00Z',
    });
    const event = parseIyzicoEvent(payload);
    expect(event.event).toBe('subscription.canceled');
    expect(event.iyzicoReferenceCode).toBe('iyz-2');
  });

  it('throws on unknown event type', () => {
    const payload = JSON.stringify({
      event: 'subscription.unknown_event',
      iyzicoReferenceCode: 'iyz-3',
      occurredAt: '2026-05-06T10:00:00Z',
    });
    expect(() => parseIyzicoEvent(payload)).toThrow();
  });

  it('throws on malformed JSON', () => {
    expect(() => parseIyzicoEvent('not json')).toThrow();
  });
});
