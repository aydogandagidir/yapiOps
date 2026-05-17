import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { Plus } from 'lucide-react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

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
        <CardContent>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('empty.cta')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
