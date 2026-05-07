import { Resend } from 'resend';

/**
 * Resend singleton. RESEND_API_KEY yoksa null döner — gönderici fonksiyonlar
 * bu durumda no-op'a düşer; geliştirme/test ortamında log gürültüsü olmaz.
 */

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (client) return client;
  client = new Resend(apiKey);
  return client;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? 'YapıOps <noreply@yapiops.com>';
}
