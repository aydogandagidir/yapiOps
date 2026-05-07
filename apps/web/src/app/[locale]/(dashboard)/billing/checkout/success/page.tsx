import { setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function CheckoutSuccessPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <CardTitle>Ödeme Başarılı</CardTitle>
        <CardDescription>
          Aboneliğiniz aktif. E-fatura kısa süre içinde e-postanıza gönderilecek.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button asChild>
          <Link href="/billing">Faturalama&apos;ya Dön</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
