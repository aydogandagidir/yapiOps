import { setRequestLocale } from 'next-intl/server';

import { Ek3List } from '@/components/ek3/ek3-list';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Ek3PilotListPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Ek3List />;
}
