import { describe, expect, it } from 'vitest';

import { PreferencesPatchSchema } from '@/app/api/users/me/preferences/_schema';

describe('PreferencesPatchSchema', () => {
  it('accepts an empty patch (no-op)', () => {
    expect(PreferencesPatchSchema.safeParse({}).success).toBe(true);
  });

  it('accepts ek3_generated alone', () => {
    expect(PreferencesPatchSchema.safeParse({ email_ek3_generated: true }).success).toBe(true);
  });

  it('accepts weekly_digest alone', () => {
    expect(PreferencesPatchSchema.safeParse({ email_weekly_digest: false }).success).toBe(true);
  });

  it('accepts both flags together', () => {
    expect(
      PreferencesPatchSchema.safeParse({
        email_ek3_generated: false,
        email_weekly_digest: true,
      }).success,
    ).toBe(true);
  });

  it('rejects non-boolean values', () => {
    expect(PreferencesPatchSchema.safeParse({ email_ek3_generated: 'yes' }).success).toBe(false);
  });

  it('strips unknown keys silently (Zod default)', () => {
    const result = PreferencesPatchSchema.safeParse({
      email_ek3_generated: true,
      email_marketing_blast: true, // bilinmeyen anahtar
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('email_marketing_blast');
    }
  });
});
