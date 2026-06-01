import { setRequestLocale } from 'next-intl/server';

import { LandingPage } from '@/components/marketing/landing-page';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function RootPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingPage />;
}
