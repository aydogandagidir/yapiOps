import { type SupabaseClient } from '@supabase/supabase-js';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import type { Ek3TemplateRow } from '@yapiops/ek3';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Ek3TemplateManager } from '@/components/ek3/templates/ek3-template-manager';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Ek3TemplatesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    redirect(`/${locale}/login`);
  }
  if (!canManageOrg(ctx.membership.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const { data } = await supabase
    .from('ek3_templates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(100);

  return <Ek3TemplateManager initialTemplates={(data ?? []) as Ek3TemplateRow[]} />;
}
