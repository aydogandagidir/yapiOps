import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { LoginForm } from './login-form';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // LoginForm uses useSearchParams (to surface ?error= banners). Next.js 15
  // requires a Suspense boundary around any client tree that calls
  // useSearchParams during prerender, otherwise the whole page bails out of
  // SSG. Wrapping here keeps the page statically generated for both locales.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
