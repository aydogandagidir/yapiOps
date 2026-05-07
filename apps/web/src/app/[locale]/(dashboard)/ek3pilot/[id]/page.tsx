import { type SupabaseClient } from '@supabase/supabase-js';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Ek3Wizard, type Ek3FormDataPartial } from '@/components/ek3/ek3-wizard';
import { EtabsImportButton } from '@/components/ek3/etabs-import-button';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface Ek3DetailRow {
  id: string;
  status: 'draft' | 'completed' | 'signed' | 'superseded';
  form_data: Ek3FormDataPartial | null;
  pdf_url: string | null;
  version: number;
  project_id: string;
}

export default async function Ek3PilotDetailPage({ params }: PageProps) {
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
    .from('ek3_forms')
    .select('id, status, form_data, pdf_url, version, project_id')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<Ek3DetailRow>();
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ek-3 v{row.version}</h1>
          <p className="text-sm text-muted-foreground">
            Proje:{' '}
            <span className="font-mono">{row.project_id.slice(0, 8)}</span>… · Durum:{' '}
            <span className="font-medium">{row.status}</span>
          </p>
        </div>
        <EtabsImportButton ek3Id={row.id} projectId={row.project_id} />
      </div>

      <Ek3Wizard
        ek3Id={row.id}
        initialData={row.form_data ?? {}}
        initialStatus={row.status}
      />
    </div>
  );
}
