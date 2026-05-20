import { setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function CheckoutFailedPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <CardTitle>Ödeme Başarısız</CardTitle>
        <CardDescription>
          Ödeme işlemi tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyin veya farklı bir
          kart kullanın.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-x-2">
        <Button asChild>
          <Link href="/billing/upgrade">Tekrar Dene</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/billing">Geri Dön</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
