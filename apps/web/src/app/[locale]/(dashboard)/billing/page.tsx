import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface Subscription {
  id: string;
  plan_code: string;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
}

interface Invoice {
  id: string;
  amount_try: number;
  vat_amount: number;
  e_invoice_status: string | null;
  issued_at: string | null;
  pdf_url: string | null;
}

export default async function BillingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const ctx = await requireAuthContext(cookieStore);

  const supabase = createSupabaseServerClient(cookieStore);

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan_code, status, current_period_end, trial_end')
    .eq('org_id', ctx.membership.orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();

  const { data: invoiceRows } = await supabase
    .from('invoices')
    .select('id, amount_try, vat_amount, e_invoice_status, issued_at, pdf_url')
    .eq('org_id', ctx.membership.orgId)
    .order('issued_at', { ascending: false })
    .limit(20);

  const invoices: Invoice[] = (invoiceRows ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faturalama</h1>
        <p className="text-sm text-muted-foreground">Plan, abonelik ve fatura yönetimi.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mevcut Plan</CardTitle>
          <CardDescription>
            {sub
              ? `${formatPlan(sub.plan_code)} — ${formatStatus(sub.status)}`
              : 'Henüz abonelik yok'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sub?.status === 'trialing' && sub.trial_end ? (
            <p className="text-sm">
              Deneme {formatDate(sub.trial_end)} tarihinde sona eriyor.
            </p>
          ) : sub?.current_period_end ? (
            <p className="text-sm">
              Sonraki yenileme: {formatDate(sub.current_period_end)}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/billing/upgrade">Plan Yükselt</Link>
            </Button>
            {sub?.status === 'active' ? (
              <form action="/api/billing/cancel" method="post">
                <Button type="submit" variant="outline">
                  Aboneliği İptal Et
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fatura Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz fatura yok.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Tarih</th>
                  <th className="py-2">Tutar (KDV dahil)</th>
                  <th className="py-2">E-Fatura</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="py-2">{inv.issued_at ? formatDate(inv.issued_at) : '—'}</td>
                    <td className="py-2">
                      ₺{(inv.amount_try + inv.vat_amount).toFixed(2)}
                    </td>
                    <td className="py-2">{inv.e_invoice_status ?? 'beklemede'}</td>
                    <td className="py-2 text-right">
                      {inv.pdf_url ? (
                        <a
                          className="text-primary hover:underline"
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatPlan(code: string): string {
  const map: Record<string, string> = {
    free: 'Ücretsiz',
    solo_monthly: 'Solo Aylık',
    solo_yearly: 'Solo Yıllık',
    office_monthly: 'Office Aylık',
    office_yearly: 'Office Yıllık',
    office_ai_monthly: 'Office+AI Aylık',
    office_ai_yearly: 'Office+AI Yıllık',
    enterprise: 'Enterprise',
  };
  return map[code] ?? code;
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    trialing: 'Deneme',
    active: 'Aktif',
    past_due: 'Ödeme Bekliyor',
    canceled: 'İptal Edildi',
  };
  return map[status] ?? status;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR');
}
