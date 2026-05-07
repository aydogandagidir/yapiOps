import { canViewAudit } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import type { AuditAction } from '@yapiops/db';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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

  if (!canViewAudit(ctx.membership.role)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yetki Yok</CardTitle>
          <CardDescription>
            Audit log&apos;ları yalnızca owner ve admin görüntüleyebilir.
          </CardDescription>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Son 100 sistem olayı. KVKK ve mühendislik sorumluluğu için tutulur.
        </p>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Tarih</th>
                <th className="px-4 py-2">Eylem</th>
                <th className="px-4 py-2">Kaynak</th>
                <th className="px-4 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    {new Date(row.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-2 text-xs">
                    {row.resource_type ? `${row.resource_type}:${row.resource_id ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.ip_address ?? '—'}</td>
                </tr>
              ))}
              {auditRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Henüz audit kaydı yok.
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
