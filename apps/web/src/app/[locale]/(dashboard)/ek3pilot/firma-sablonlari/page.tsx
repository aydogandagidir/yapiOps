import { setRequestLocale } from 'next-intl/server';

import { FirmaSablonManager } from '@/components/ek3/firma-sablon-manager';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function FirmaSablonlariPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FirmaSablonManager />;
}
