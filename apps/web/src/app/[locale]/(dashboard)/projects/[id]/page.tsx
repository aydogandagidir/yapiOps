import { type SupabaseClient } from '@supabase/supabase-js';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { ProjectDetail } from '@/components/projects/project-detail';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface ProjectDetailRow {
  id: string;
  name: string;
  pafta_no: string | null;
  ada_no: string | null;
  parsel_no: string | null;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    redirect(`/${locale}/login`);
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const { data: row } = await supabase
    .from('projects')
    .select(
      'id, name, pafta_no, ada_no, parsel_no, il, ilce, mahalle, created_at, updated_at, archived_at',
    )
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<ProjectDetailRow>();

  if (!row || row.archived_at) notFound();

  return <ProjectDetail project={row} canDelete={canManageOrg(ctx.membership.role)} />;
}
