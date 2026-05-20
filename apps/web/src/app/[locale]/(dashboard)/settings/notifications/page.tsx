import { type SupabaseClient } from '@supabase/supabase-js';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { NotificationPreferences } from '@/components/settings/notification-preferences';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface UserPreferencesRow {
  preferences: Record<string, boolean | undefined> | null;
}

export default async function NotificationsSettingsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    redirect(`/${locale}/login`);
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const { data } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', ctx.user.id)
    .maybeSingle<UserPreferencesRow>();

  const initial = data?.preferences ?? {};

  return (
    <NotificationPreferences
      initialEk3Generated={initial.email_ek3_generated !== false}
      initialWeeklyDigest={initial.email_weekly_digest === true}
    />
  );
}
