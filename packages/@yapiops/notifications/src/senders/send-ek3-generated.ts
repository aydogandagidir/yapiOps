import { render } from '@react-email/components';

import { getEmailFrom, getResendClient } from '../resend-client';
import { Ek3GeneratedEmail, ek3GeneratedSubject } from '../templates/ek3-generated';

export interface SendEk3GeneratedInput {
  to: string;
  locale: 'tr' | 'en';
  recipientName: string;
  projectName: string;
  ek3Version: number;
  pdfUrl: string;
  appUrl: string;
}

export interface SendResult {
  status: 'sent' | 'skipped';
  reason?: 'no_api_key' | 'no_recipient';
  messageId?: string;
}

/**
 * `ek3.generated` sonrası tetiklenen e-posta. RESEND_API_KEY veya `to` boşsa
 * sessizce no-op'a düşer (status: 'skipped'). Hatayı throw etmez — caller
 * route handler buna güvenip catch'siz `await` edebilir.
 *
 * Aynı durumda Sentry'ye hata düşürmek isteyen caller'lar dönüş status'una
 * bakıp manuel `captureException` çağırabilir.
 */
export async function sendEk3GeneratedEmail(
  input: SendEk3GeneratedInput,
): Promise<SendResult> {
  if (!input.to) return { status: 'skipped', reason: 'no_recipient' };
  const client = getResendClient();
  if (!client) return { status: 'skipped', reason: 'no_api_key' };

  const html = await render(
    Ek3GeneratedEmail({
      locale: input.locale,
      recipientName: input.recipientName,
      projectName: input.projectName,
      ek3Version: input.ek3Version,
      pdfUrl: input.pdfUrl,
      appUrl: input.appUrl,
    }),
  );

  const { data, error } = await client.emails.send({
    from: getEmailFrom(),
    to: input.to,
    subject: ek3GeneratedSubject(input.locale),
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
  return { status: 'sent', messageId: data?.id };
}
