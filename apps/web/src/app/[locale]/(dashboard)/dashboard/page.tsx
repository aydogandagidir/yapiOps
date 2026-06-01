import { type SupabaseClient } from '@supabase/supabase-js';
import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { checkQuota } from '@yapiops/billing/quota';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import {
  DashboardOverview,
  type Ek3Status,
  type RecentEk3Item,
} from '@/components/dashboard/dashboard-overview';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface RecentRow {
  id: string;
  version: number;
  status: Ek3Status;
  generated_at: string | null;
  created_at: string;
  // The PostgREST join `project:projects(name)` may surface as a single object
  // (many-to-one FK) or, depending on supabase-js version, as an array. Handle
  // both defensively so a future client upgrade can't silently break the row.
  project: { name: string } | { name: string }[] | null;
}

function pickProjectName(project: RecentRow['project']): string | null {
  if (project === null) return null;
  if (Array.isArray(project)) return project[0]?.name ?? null;
  return project.name;
}

export default async function DashboardPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const session = await getServerSession(cookieStore);
  if (!session) redirect(`/${locale}/login`);
  const membership = await getOrgMembership(cookieStore, session.user.id);
  if (!membership) redirect(`/${locale}/login`);

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const orgId = membership.orgId;

  const [projectsRes, ek3Res, quota, recentRes] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('ek3_forms').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    checkQuota(supabase, orgId, 'ek3Generations'),
    supabase
      .from('ek3_forms')
      .select('id, version, status, generated_at, created_at, project:projects(name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recentRaw = (recentRes.data ?? []) as RecentRow[];
  const recent: RecentEk3Item[] = recentRaw.map((row) => ({
    id: row.id,
    version: row.version,
    status: row.status,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    projectName: pickProjectName(row.project),
  }));

  return (
    <DashboardOverview
      locale={locale}
      fullName={membership.fullName}
      projectCount={projectsRes.count ?? 0}
      ek3Count={ek3Res.count ?? 0}
      quotaUsed={quota.used}
      quotaLimit={quota.limit}
      recent={recent}
    />
  );
}
