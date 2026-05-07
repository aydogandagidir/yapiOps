import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;

  return <VerifyEmailContent email={email ?? ''} />;
}

function VerifyEmailContent({ email }: { email: string }) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('auth.verifyEmailTitle')}</CardTitle>
        <CardDescription>
          {t('auth.verifyEmailBody', { email: email || '...' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Link href="/login" className="text-sm font-medium hover:underline">
          {t('auth.loginTitle')}
        </Link>
      </CardContent>
    </Card>
  );
}
