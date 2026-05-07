import { describe, expect, it } from 'vitest';

import { BYS_MATRIX, expectedBysFor } from '../tbdy-tables';
import { bysConsistency } from '../validators';

describe('BYS_MATRIX shape', () => {
  it('contains exactly DTS keys 1..4', () => {
    expect(Object.keys(BYS_MATRIX).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('DTS=1 row covers BYS 1..8 once each (current truth)', () => {
    const dts1 = BYS_MATRIX[1];
    expect(dts1.map((r) => r.bys).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Sıralı: küçük HN'den büyüğe (yapı kısa → uzun = BYS 8 → 1).
    expect(dts1[0]?.bys).toBe(8);
    expect(dts1[dts1.length - 1]?.bys).toBe(1);
  });
});

describe('expectedBysFor — DTS=1', () => {
  it.each([
    [10, 8],
    [17.5, 8],
    [17.51, 7],
    [50, 5],
    [70, 4],
    [104, 2],
    [120, 1],
    [500, 1],
  ])('HN=%s → BYS=%s', (hn, expected) => {
    expect(expectedBysFor(hn, 1).expected).toBe(expected);
  });

  it('returns unverified=false when DTS=1 row is filled', () => {
    expect(expectedBysFor(50, 1).unverified).toBe(false);
  });
});

describe('expectedBysFor — unverified DTS rows (placeholder)', () => {
  it.each([2, 3, 4] as const)('DTS=%s row is empty until user provides Tablo 3.3', (dts) => {
    const result = expectedBysFor(50, dts);
    expect(result.unverified).toBe(true);
    expect(result.expected).toBeNull();
  });
});

describe('bysConsistency', () => {
  it('passes when expected and actual BYS match (DTS=1)', () => {
    expect(bysConsistency(50, 1, 5)).toEqual({ ok: true });
  });

  it('warns when delta > 1 (DTS=1)', () => {
    const r = bysConsistency(120, 1, 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.warning).toMatch(/Override edilebilir/);
  });

  it('returns unverified soft-warning for DTS=2,3,4 until matris filled', () => {
    for (const dts of [2, 3, 4]) {
      const r = bysConsistency(50, dts, 5);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.warning).toMatch(/doğrulanmamış/);
    }
  });

  it('rejects out-of-range DTS', () => {
    const r = bysConsistency(50, 7, 3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.warning).toMatch(/sınır dışı/);
  });

  // Hafta 9.2.b — kullanıcı TBDY Tablo 3.3'ü paylaşınca aktive edilecek.
  it.todo('DTS=2 satırı: HN=50 için beklenen BYS doğru hesaplanmalı');
  it.todo('DTS=3 satırı: HN=50 için beklenen BYS doğru hesaplanmalı');
  it.todo('DTS=4 satırı: HN=50 için beklenen BYS doğru hesaplanmalı');
});
