import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

import { Footer } from './shared/footer';

export interface Ek3GeneratedEmailProps {
  locale: 'tr' | 'en';
  recipientName: string;
  projectName: string;
  ek3Version: number;
  pdfUrl: string;
  appUrl: string;
}

const COPY = {
  tr: {
    subject: 'Ek-3 PDF üretildi',
    preview: 'Yapı Denetim Hizmet Sözleşmesi Ek-3 formunuz hazır.',
    greeting: (name: string) => `Merhaba ${name},`,
    body: (project: string, version: number) =>
      `${project} projesi için Ek-3 v${String(version)} formu üretildi ve e-imzaya hazır durumda.`,
    cta: "PDF'i Görüntüle",
    secondaryHint:
      "Bağlantı 24 saat içinde sona ererse, panele gidip aynı Ek-3 kaydından PDF'i tekrar indirebilirsiniz.",
  },
  en: {
    subject: 'Your Ek-3 PDF is ready',
    preview: 'Your Yapı Denetim Ek-3 form is ready.',
    greeting: (name: string) => `Hi ${name},`,
    body: (project: string, version: number) =>
      `Your Ek-3 v${String(version)} for project "${project}" has been generated and is ready for e-signature.`,
    cta: 'View PDF',
    secondaryHint:
      'If the link expires within 24 hours, you can re-download it from the same Ek-3 record on the dashboard.',
  },
} as const;

export function Ek3GeneratedEmail(props: Ek3GeneratedEmailProps) {
  const t = COPY[props.locale];
  const preferencesUrl = `${props.appUrl}/${props.locale}/settings/notifications`;

  return (
    <Html lang={props.locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', margin: 0 }}>
        <Container style={{ padding: 24, maxWidth: 560 }}>
          <Heading as="h1" style={{ fontSize: 22, color: '#111827', margin: '8px 0' }}>
            {t.subject}
          </Heading>
          <Text style={{ fontSize: 15, color: '#374151', marginTop: 16 }}>
            {t.greeting(props.recipientName)}
          </Text>
          <Text style={{ fontSize: 15, color: '#374151' }}>
            {t.body(props.projectName, props.ek3Version)}
          </Text>

          <Section style={{ margin: '24px 0' }}>
            <Button
              href={props.pdfUrl}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {t.cta}
            </Button>
          </Section>

          <Text style={{ fontSize: 13, color: '#6b7280' }}>{t.secondaryHint}</Text>

          <Footer locale={props.locale} preferencesUrl={preferencesUrl} />
        </Container>
      </Body>
    </Html>
  );
}

export function ek3GeneratedSubject(locale: 'tr' | 'en'): string {
  return COPY[locale].subject;
}
