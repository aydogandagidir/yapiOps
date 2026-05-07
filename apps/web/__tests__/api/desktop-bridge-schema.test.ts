import { describe, expect, it } from 'vitest';

import {
  BridgeRefreshSchema,
  BridgeStartParamsSchema,
} from '@/app/api/auth/desktop-bridge/_schema';

describe('BridgeRefreshSchema', () => {
  it('accepts a typical Supabase refresh token (>=20 chars)', () => {
    expect(
      BridgeRefreshSchema.safeParse({
        refresh_token: 'abc123def456ghi789jkl012',
      }).success,
    ).toBe(true);
  });

  it('rejects too-short tokens', () => {
    expect(BridgeRefreshSchema.safeParse({ refresh_token: 'short' }).success).toBe(false);
  });

  it('rejects unrelated payloads', () => {
    expect(
      BridgeRefreshSchema.safeParse({ access_token: 'abc...' }).success,
    ).toBe(false);
  });

  it('caps token length at 2048', () => {
    expect(
      BridgeRefreshSchema.safeParse({ refresh_token: 'a'.repeat(2049) }).success,
    ).toBe(false);
  });
});

describe('BridgeStartParamsSchema', () => {
  it('accepts the canonical loopback redirect (port 53682)', () => {
    expect(
      BridgeStartParamsSchema.safeParse({
        redirect_uri: 'http://localhost:53682/callback',
        state: 'csrf-state-12345',
      }).success,
    ).toBe(true);
  });

  it('accepts the custom yapiops-bridge:// protocol fallback', () => {
    expect(
      BridgeStartParamsSchema.safeParse({
        redirect_uri: 'yapiops-bridge://callback?session=1',
        state: 'state-1234567',
      }).success,
    ).toBe(true);
  });

  it('rejects arbitrary HTTP URLs (not loopback)', () => {
    const result = BridgeStartParamsSchema.safeParse({
      redirect_uri: 'https://evil.example.com/callback',
      state: 'state-12345678',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/loopback/);
    }
  });

  it('rejects loopback on a non-53682 port', () => {
    expect(
      BridgeStartParamsSchema.safeParse({
        redirect_uri: 'http://localhost:9999/callback',
        state: 'state-12345678',
      }).success,
    ).toBe(false);
  });

  it('rejects too-short state (<8 chars, CSRF güvenliği)', () => {
    expect(
      BridgeStartParamsSchema.safeParse({
        redirect_uri: 'http://localhost:53682/callback',
        state: 'short',
      }).success,
    ).toBe(false);
  });

  it('rejects malformed redirect_uri', () => {
    expect(
      BridgeStartParamsSchema.safeParse({
        redirect_uri: 'not-a-url',
        state: 'state-12345678',
      }).success,
    ).toBe(false);
  });
});
