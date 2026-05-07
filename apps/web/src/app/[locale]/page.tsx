import { redirect } from '@/i18n/navigation';

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Phase 0: route the root to login. Once we have a session check, switch
  // to /dashboard for authenticated users.
  redirect({ href: '/login', locale });
}
