import { expectedBysFor } from './tbdy-tables';

/**
 * TCKN / VKN / TBDY consistency validators. Pure functions; no side effects,
 * safe to run client-side.
 *
 * TCKN algorithm reference: T.C. Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü,
 * 11-digit national identifier with two checksum digits (positions 10 and 11).
 *
 * TBDY 2018 reference: §3 Tablo 3.2 (DTS by Sds), Tablo 3.3 (BYS by height).
 */

export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  // strict-type-checked + noUncheckedIndexedAccess: index access yields T | undefined.
  // We've already enforced 11-character length via the regex, so missing index
  // values are unreachable. Substitute 0 as a defensive fallback.
  const d = (i: number): number => digits[i] ?? 0;

  const oddSum = d(0) + d(2) + d(4) + d(6) + d(8);
  const evenSum = d(1) + d(3) + d(5) + d(7);
  const tenthDigit = (oddSum * 7 - evenSum) % 10;
  if ((tenthDigit + 10) % 10 !== d(9)) return false;

  const totalFirstTen = digits.slice(0, 10).reduce((acc, n) => acc + n, 0);
  if (totalFirstTen % 10 !== d(10)) return false;

  return true;
}

/**
 * VKN (Vergi Kimlik Numarası) format check. Turkey's VKN is 10 digits; the
 * official mod-9 algorithm exists but is rarely surfaced in public APIs and
 * the form authority accepts string presence + 10 digits. We keep the format
 * gate strict and add a soft mod-9 helper for advanced UIs.
 */
export function isValidVkn(value: string): boolean {
  return /^\d{10}$/.test(value);
}

/**
 * Optional VKN mod-9 checksum. Returns true for the lenient case (well-formed
 * 10-digit string passes baseline `isValidVkn`); use this for stricter UIs.
 */
export function isValidVknMod9(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const digits = value.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const di = digits[i] ?? 0;
    const tmp = (di + (9 - i)) % 10;
    sum += tmp === 0 ? 0 : (tmp * 2 ** (9 - i)) % 9;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === (digits[9] ?? -1);
}

export type ConsistencyResult = { ok: true } | { ok: false; warning: string };

/**
 * TBDY 2018 Tablo 3.2 — Deprem Tasarım Sınıfı by Sds threshold.
 * Boundaries are inclusive on the lower side. Returns `ok: false` with a
 * human-readable warning when the (Sds, DTS) pair is inconsistent.
 *
 * Engineer override is allowed (warning only). See CLAUDE.md §9.2.
 */
export function dtsConsistency(sds: number, dts: number): ConsistencyResult {
  if (!Number.isFinite(sds) || sds < 0) {
    return { ok: false, warning: 'Sds pozitif bir sayı olmalı' };
  }

  let expected: 1 | 2 | 3 | 4;
  if (sds >= 0.75) expected = 1;
  else if (sds >= 0.5) expected = 2;
  else if (sds >= 0.33) expected = 3;
  else expected = 4;

  if (expected !== dts) {
    return {
      ok: false,
      warning: `Sds=${String(sds)} için TBDY Tablo 3.2'ye göre beklenen DTS=${String(expected)}, girilen=${String(dts)}`,
    };
  }
  return { ok: true };
}

/**
 * TBDY 2018 §3.3.1 Tablo 3.3 — Bina Yükseklik Sınıfı (BYS).
 *
 * Matris `tbdy-tables.ts`'te tutulur; her DTS için ayrı satır var (Tablo 3.3
 * tüm satırları). Verilen DTS henüz matriste tanımlanmadıysa "doğrulanmamış"
 * yumuşak uyarı döner — engelleme yapmaz, mühendis sorumluluğuna bırakır
 * (CLAUDE.md §9.2).
 */
export function bysConsistency(yukseklikM: number, dts: number, bys: number): ConsistencyResult {
  if (!Number.isFinite(yukseklikM) || yukseklikM <= 0) {
    return { ok: false, warning: 'Yükseklik pozitif bir sayı olmalı' };
  }
  if (dts !== 1 && dts !== 2 && dts !== 3 && dts !== 4) {
    return { ok: false, warning: `DTS sınır dışı: ${String(dts)} (1-4 olmalı)` };
  }

  const result = expectedBysFor(yukseklikM, dts);

  if (result.unverified) {
    return {
      ok: false,
      warning: `BYS-DTS matris bu DTS için henüz doğrulanmamış (DTS=${String(dts)}). Mühendis kontrolü zorunlu.`,
    };
  }

  if (result.expected != null && Math.abs(result.expected - bys) > 1) {
    return {
      ok: false,
      warning: `Yükseklik=${String(yukseklikM)}m + DTS=${String(dts)} için beklenen BYS≈${String(result.expected)}, girilen=${String(bys)}. Override edilebilir.`,
    };
  }
  return { ok: true };
}

/**
 * Convenience aggregator: runs every cross-field rule and returns warnings.
 * Empty array means all checks passed.
 */
export interface YapiCrossCheckInput {
  sds?: number;
  dts: number;
  yukseklikM: number;
  bys: number;
}

export function yapiCrossChecks(input: YapiCrossCheckInput): string[] {
  const warnings: string[] = [];
  if (input.sds != null) {
    const r = dtsConsistency(input.sds, input.dts);
    if (!r.ok) warnings.push(r.warning);
  }
  const r2 = bysConsistency(input.yukseklikM, input.dts, input.bys);
  if (!r2.ok) warnings.push(r2.warning);
  return warnings;
}
