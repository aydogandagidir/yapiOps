import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

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

const PLAN_KEY: Record<string, string> = {
  free: 'free',
  solo_monthly: 'soloMonthly',
  solo_yearly: 'soloYearly',
  office_monthly: 'officeMonthly',
  office_yearly: 'officeYearly',
  office_ai_monthly: 'officeAiMonthly',
  office_ai_yearly: 'officeAiYearly',
  enterprise: 'enterprise',
};

const STATUS_KEY: Record<string, string> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'pastDue',
  canceled: 'canceled',
  expired: 'expired',
};

export default async function BillingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const ctx = await requireAuthContext(cookieStore);

  const supabase = createSupabaseServerClient(cookieStore);
  const t = await getTranslations('billing');

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

  const planLabel = sub
    ? t(`plans.${PLAN_KEY[sub.plan_code] ?? 'free'}` as 'plans.free')
    : '';
  const statusLabel = sub
    ? t(`status.${STATUS_KEY[sub.status] ?? 'trialing'}` as 'status.trialing')
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
          <CardDescription>
            {sub ? `${planLabel} — ${statusLabel}` : t('noSubscription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sub?.status === 'trialing' && sub.trial_end ? (
            <p className="text-sm">
              {t('trialEnds', { date: formatDate(sub.trial_end, locale) })}
            </p>
          ) : sub?.current_period_end ? (
            <p className="text-sm">
              {t('nextRenewal', { date: formatDate(sub.current_period_end, locale) })}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/billing/upgrade">{t('upgradeButton')}</Link>
            </Button>
            {sub?.status === 'active' ? (
              <form action="/api/billing/cancel" method="post">
                <Button type="submit" variant="outline">
                  {t('cancelSubscription')}
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noInvoices')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">{t('table.date')}</th>
                  <th className="py-2">{t('table.amount')}</th>
                  <th className="py-2">{t('table.eFatura')}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="py-2">
                      {inv.issued_at ? formatDate(inv.issued_at, locale) : '—'}
                    </td>
                    <td className="py-2">
                      ₺{(inv.amount_try + inv.vat_amount).toFixed(2)}
                    </td>
                    <td className="py-2">
                      {inv.e_invoice_status ?? t('table.eFaturaPending')}
                    </td>
                    <td className="py-2 text-right">
                      {inv.pdf_url ? (
                        <a
                          className="text-primary hover:underline"
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('table.pdf')}
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

function formatDate(iso: string, locale: string): string {
  // tr → tr-TR (DD.MM.YYYY), en → en-US default. Para birimi (₺) Türkiye-spesifik
  // bilinçli olarak sabit; uluslararası versiyonda dahi iyzico TRY ile çalışır.
  const tag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Date(iso).toLocaleDateString(tag);
}
