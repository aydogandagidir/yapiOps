import { describe, expect, it } from 'vitest';

import {
  bysConsistency,
  dtsConsistency,
  isValidTckn,
  isValidVkn,
  yapiCrossChecks,
} from '../validators';

/**
 * Reference TCKN test vectors. Generated with the canonical algorithm
 * (T.C. NVİGM); these are NOT real identities — they're synthesized to
 * exercise the checksum logic only.
 *
 * Algorithm: digits[9] = ((odd*7 - even) mod 10 + 10) mod 10,
 * digits[10] = sum(first 10 digits) mod 10.
 */
const VALID_TCKNS = ['12345678950', '98765432150', '11111111110'];

const INVALID_TCKNS = [
  '00000000000', // starts with 0
  '12345678901', // wrong checksum
  '1234567890', // 10 digits
  '123456789012', // 12 digits
  'abcdefghijk', // non-numeric
  '12345678910', // wrong 11th digit
];

describe('isValidTckn', () => {
  it.each(VALID_TCKNS)('accepts %s', (tckn) => {
    expect(isValidTckn(tckn)).toBe(true);
  });

  it.each(INVALID_TCKNS)('rejects %s', (tckn) => {
    expect(isValidTckn(tckn)).toBe(false);
  });
});

describe('isValidVkn', () => {
  it('accepts 10-digit numeric strings', () => {
    expect(isValidVkn('1234567890')).toBe(true);
  });

  it('rejects non-10-digit strings', () => {
    expect(isValidVkn('123456789')).toBe(false);
    expect(isValidVkn('12345678901')).toBe(false);
    expect(isValidVkn('123456789a')).toBe(false);
  });
});

describe('dtsConsistency', () => {
  it('returns ok for matching Sds/DTS pairs', () => {
    expect(dtsConsistency(0.85, 1)).toEqual({ ok: true });
    expect(dtsConsistency(0.6, 2)).toEqual({ ok: true });
    expect(dtsConsistency(0.4, 3)).toEqual({ ok: true });
    expect(dtsConsistency(0.2, 4)).toEqual({ ok: true });
  });

  it('returns warning for mismatched Sds/DTS pairs', () => {
    const r = dtsConsistency(0.85, 4);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.warning).toContain('DTS=1');
  });

  it('rejects non-finite Sds', () => {
    const r = dtsConsistency(Number.NaN, 2);
    expect(r.ok).toBe(false);
  });
});

describe('bysConsistency', () => {
  it('returns ok for tall buildings → low BYS', () => {
    expect(bysConsistency(120, 1, 1).ok).toBe(true);
  });

  it('returns ok for short buildings → high BYS', () => {
    expect(bysConsistency(15, 2, 8).ok).toBe(true);
  });

  it('warns when BYS is wildly off', () => {
    const r = bysConsistency(120, 1, 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.warning).toContain('Override');
  });
});

describe('yapiCrossChecks', () => {
  it('returns no warnings for consistent input', () => {
    const ws = yapiCrossChecks({ sds: 0.6, dts: 2, yukseklikM: 60, bys: 4 });
    expect(ws).toEqual([]);
  });

  it('aggregates DTS + BYS warnings', () => {
    const ws = yapiCrossChecks({ sds: 0.85, dts: 4, yukseklikM: 120, bys: 8 });
    expect(ws.length).toBe(2);
  });
});
