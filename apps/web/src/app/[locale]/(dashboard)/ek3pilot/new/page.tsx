import { type SupabaseClient } from '@supabase/supabase-js';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Ek3NewClient } from '@/components/ek3/ek3-new-client';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Ek3PilotNewPage({ params }: PageProps) {
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
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', ctx.membership.orgId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(50);

  return <Ek3NewClient projects={projects ?? []} />;
}
