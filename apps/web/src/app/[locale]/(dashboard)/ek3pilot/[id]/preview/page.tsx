import { type SupabaseClient } from '@supabase/supabase-js';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Ek3PdfPreview } from '@/components/ek3/pdf-preview';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface Ek3PreviewRow {
  id: string;
  pdf_url: string | null;
  status: 'draft' | 'completed' | 'signed' | 'superseded';
  version: number;
}

export default async function Ek3PilotPreviewPage({ params }: PageProps) {
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
    .select('id, pdf_url, status, version')
    .eq('id', id)
    .eq('org_id', ctx.membership.orgId)
    .maybeSingle<Ek3PreviewRow>();
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ek-3 v{row.version} — Önizleme</h1>
        <p className="text-sm text-muted-foreground">Durum: {row.status}</p>
      </div>
      <Ek3PdfPreview ek3Id={row.id} pdfUrl={row.pdf_url} />
    </div>
  );
}
