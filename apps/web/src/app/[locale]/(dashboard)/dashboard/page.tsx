import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const session = await getServerSession(cookieStore);
  const membership = session ? await getOrgMembership(cookieStore, session.user.id) : null;

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {membership?.fullName
            ? t('welcome', { name: membership.fullName })
            : t('welcomeAnonymous')}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('empty.title')}</CardTitle>
          <CardDescription>{t('empty.description')}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
