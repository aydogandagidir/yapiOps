import Iyzipay from 'iyzipay';

let cached: Iyzipay | null = null;

/**
 * Returns the Iyzipay SDK instance (singleton). Reads `IYZICO_API_KEY`,
 * `IYZICO_SECRET_KEY`, and `IYZICO_BASE_URL` from the environment.
 *
 * In sandbox: `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`
 * In prod:    `IYZICO_BASE_URL=https://api.iyzipay.com`
 */
export function getIyzipayClient(): Iyzipay {
  if (cached) return cached;

  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL;

  if (!apiKey || !secretKey || !baseUrl) {
    throw new Error(
      'Missing Iyzico credentials: IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL.',
    );
  }

  cached = new Iyzipay({ apiKey, secretKey, uri: baseUrl });
  return cached;
}

/** Test-only — clears the cached singleton between Vitest runs. */
export function __resetIyzipayClientForTests(): void {
  cached = null;
}
