/**
 * Locale-aware date/time formatters.
 *
 * Replaces the scattered `new Date(x).toLocaleDateString('tr-TR')` hardcodings.
 * Accepts the next-intl locale (`'tr'` | `'en'`) and maps to BCP 47 tags.
 */

function resolveBcp47(locale: string): string {
  return locale === 'tr' ? 'tr-TR' : 'en-US';
}

export function formatLocaleDate(
  value: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(resolveBcp47(locale), options);
}

export function formatLocaleTime(
  value: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleTimeString(resolveBcp47(locale), options);
}

export function formatLocaleDateTime(
  value: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleString(resolveBcp47(locale), options);
}

export function formatLocaleNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(resolveBcp47(locale), options);
}
