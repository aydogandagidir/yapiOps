import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hoş geldin{membership?.fullName ? `, ${membership.fullName}` : ''}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Henüz proje yok</CardTitle>
          <CardDescription>
            İlk projenizi oluşturmak için yan menüden bir modül seçin. Faz 0&apos;da yalnızca
            Faturalama aktif.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
