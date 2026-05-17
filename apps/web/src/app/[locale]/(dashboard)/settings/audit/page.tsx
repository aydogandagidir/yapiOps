import { canViewAudit } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import type { AuditAction } from '@yapiops/db';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface AuditRow {
  id: string;
  action: AuditAction;
  resource_type: string | null;
  resource_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export default async function AuditPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const ctx = await requireAuthContext(cookieStore);

  const t = await getTranslations('settings.audit');

  if (!canViewAudit(ctx.membership.role)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('forbiddenTitle')}</CardTitle>
          <CardDescription>{t('forbiddenDescription')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const supabase = createSupabaseServerClient(cookieStore);
  const { data: rows } = await supabase
    .from('audit_logs')
    .select('id, action, resource_type, resource_id, user_id, metadata, ip_address, created_at')
    .eq('org_id', ctx.membership.orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  const auditRows = (rows ?? []) as AuditRow[];
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  // i18n action labels — flat namespace with underscore-replaced keys.
  // Missing keys (new actions not yet translated) gracefully fall back to
  // the raw action string instead of throwing.
  const messages = (await getMessages()) as {
    settings?: { audit?: { actions?: Record<string, string> } };
  };
  const actionLabels = messages.settings?.audit?.actions ?? {};
  const labelFor = (action: string): string => actionLabels[action.replaceAll('.', '_')] ?? action;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{t('table.date')}</th>
                <th className="px-4 py-2">{t('table.action')}</th>
                <th className="px-4 py-2">{t('table.resource')}</th>
                <th className="px-4 py-2">{t('table.ip')}</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    {new Date(row.created_at).toLocaleString(dateLocale)}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <span className="font-medium">{labelFor(row.action)}</span>
                    <span className="ml-2 font-mono text-muted-foreground">{row.action}</span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {row.resource_type ? `${row.resource_type}:${row.resource_id ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.ip_address ?? '—'}</td>
                </tr>
              ))}
              {auditRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
