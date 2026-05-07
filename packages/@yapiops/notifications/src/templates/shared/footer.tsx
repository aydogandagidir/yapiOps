import { Hr, Link, Text } from '@react-email/components';
import * as React from 'react';

interface Props {
  locale: 'tr' | 'en';
  preferencesUrl: string;
}

const COPY = {
  tr: {
    notice:
      'Bu e-posta, hesabınızdaki ayarlara göre size gönderildi. KVKK kapsamında transactional bildirimdir.',
    preferencesLabel: 'İletişim tercihlerini değiştirmek için tıklayın.',
    company: 'Bluedev Robot Teknolojileri ve Ticaret Ltd. Şti.',
  },
  en: {
    notice:
      "This email was sent based on your account preferences. It's a transactional notification under KVKK.",
    preferencesLabel: 'Manage your notification preferences.',
    company: 'Bluedev Robot Teknolojileri ve Ticaret Ltd. Şti.',
  },
} as const;

export function Footer({ locale, preferencesUrl }: Props) {
  const t = COPY[locale];
  return (
    <>
      <Hr style={{ borderColor: '#e5e7eb', marginTop: 32 }} />
      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>{t.notice}</Text>
      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
        <Link href={preferencesUrl} style={{ color: '#2563eb' }}>
          {t.preferencesLabel}
        </Link>
      </Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>{t.company}</Text>
    </>
  );
}
