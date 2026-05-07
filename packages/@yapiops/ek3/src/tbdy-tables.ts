/**
 * TBDY 2018 sabit tabloları — tek bir kaynaktan beslenen ve testle korunan
 * lookup matrisleri. Yanlış değer = mühendislik kararı yanlış; bu yüzden
 * tabloyu *resmi yönetmelik metninden* (Resmî Gazete 30/03/2018-30364)
 * birebir alıp doğrulamak şart.
 *
 * BYS_MATRIX şu an DTS=1 satırını içeriyor (Hafta 5–7'deki orijinal
 * implementasyondan alındı). DTS=2, 3, 4 satırları kullanıcı doğrulamasıyla
 * eklenir; o zamana kadar `bysConsistency()` boş satırlar için yumuşak
 * "doğrulanmamış" uyarısı döner ve mühendis sorumluluğuna bırakır.
 */

export type DtsCode = 1 | 2 | 3 | 4;
export type BysCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BysRow {
  bys: BysCode;
  /** HN > minHN (exclusive). DTS=1 BYS=1 için yapı yüksekliği > 70 m. */
  minHN: number;
  /** HN <= maxHN (inclusive). En yüksek satırda Infinity. */
  maxHN: number;
}

/**
 * TBDY 2018 §3.3.1 Tablo 3.3 — Bina Yükseklik Sınıfı (BYS), Bina Yüksekliği
 * (HN) ve Deprem Tasarım Sınıfı (DTS) matrisi.
 *
 * Bu matrisin her hücresi ayrı bir tasarım kararına denk geldiği için
 * `data(ek3): TBDY 3.3 matrisini doğrulanmış değerlerle doldur` commit'inde
 * kullanıcı tarafından sağlanan satırlar yerleştirilir. Şu an sadece DTS=1
 * satırı dolu; diğerleri `[]` ve `bysConsistency()` orada "doğrulanmamış"
 * uyarısı dönüyor.
 *
 * Satırlar yüksek BYS'den düşüğe (yapı kısa → uzun) sıralı; ilk eşleşen
 * satır kazanır.
 */
export const BYS_MATRIX: Record<DtsCode, readonly BysRow[]> = {
  1: [
    // DTS=1 — Hafta 5-7'de validators.ts'te tanımlı eşikler. Doğrulama
    // gerektiriyor; TODO(user): TBDY 2018 Tablo 3.3 DTS=1 satırını birebir
    // teyit et.
    { bys: 8, minHN: 0, maxHN: 17.5 },
    { bys: 7, minHN: 17.5, maxHN: 28 },
    { bys: 6, minHN: 28, maxHN: 42 },
    { bys: 5, minHN: 42, maxHN: 56 },
    { bys: 4, minHN: 56, maxHN: 70 },
    { bys: 3, minHN: 70, maxHN: 91 },
    { bys: 2, minHN: 91, maxHN: 105 },
    { bys: 1, minHN: 105, maxHN: Infinity },
  ],
  // TODO(user): TBDY 2018 Tablo 3.3 DTS=2 satırı (sıralı, BYS 8→1).
  2: [],
  // TODO(user): TBDY 2018 Tablo 3.3 DTS=3 satırı.
  3: [],
  // TODO(user): TBDY 2018 Tablo 3.3 DTS=4 satırı.
  4: [],
};

export interface ExpectedBysResult {
  /** Bu satır mevcutsa beklenen BYS; matris boşsa null. */
  expected: BysCode | null;
  /** Matris bu DTS için doldurulmamışsa true. */
  unverified: boolean;
}

/**
 * Verilen DTS için yapı yüksekliğine düşen BYS'yi bulur. Matris bu DTS için
 * boşsa `unverified: true` döner ve `bysConsistency()` "doğrulanmamış" uyarısı
 * üretir.
 */
export function expectedBysFor(yukseklikM: number, dts: DtsCode): ExpectedBysResult {
  const rows = BYS_MATRIX[dts];
  if (rows.length === 0) {
    return { expected: null, unverified: true };
  }
  for (const row of rows) {
    if (yukseklikM > row.minHN && yukseklikM <= row.maxHN) {
      return { expected: row.bys, unverified: false };
    }
  }
  // Sınır dışı (negatif HN, vb.) — son satıra fallback.
  return { expected: rows[rows.length - 1]?.bys ?? null, unverified: false };
}
