'use client';

import { PLAN_CATALOG, type PlanDefinition } from '@yapiops/billing/plans';
import type { BillingInterval, PlanCode } from '@yapiops/db';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { formatLocaleNumber } from '@/lib/i18n/format';

type PaidPlan = Exclude<PlanCode, 'free' | 'enterprise'>;

// Feature labels are resolved via i18n at render time (`billing.tiers.<key>`).
// Adding a new feature: append the key here AND add the same key under
// `billing.tiers.<tier>.fN` in en.json + tr.json.
const TIERS = [
  {
    tier: 'solo',
    monthly: 'solo_monthly',
    yearly: 'solo_yearly',
    label: 'Solo',
    featureKeys: ['solo.f1', 'solo.f2', 'solo.f3'],
  },
  {
    tier: 'office',
    monthly: 'office_monthly',
    yearly: 'office_yearly',
    label: 'Office',
    featureKeys: ['office.f1', 'office.f2', 'office.f3'],
  },
  {
    tier: 'office_ai',
    monthly: 'office_ai_monthly',
    yearly: 'office_ai_yearly',
    label: 'Office + AI',
    featureKeys: ['officeAi.f1', 'officeAi.f2', 'officeAi.f3', 'officeAi.f4'],
  },
] as const;

export default function UpgradePage() {
  const t = useTranslations('billing');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loadingCode, setLoadingCode] = useState<PaidPlan | null>(null);
  const router = useRouter();

  async function handleSelect(planCode: PaidPlan) {
    setLoadingCode(planCode);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const body = (await response.json()) as { paymentPageUrl: string };
      window.location.href = body.paymentPageUrl;
    } catch (err) {
      setLoadingCode(null);
      console.error('Checkout failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('upgradeTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('selectPlanSubtitle')}</p>
      </div>

      <div className="flex w-fit gap-2 rounded-md bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            setInterval('monthly');
          }}
          className={`rounded px-3 py-1 text-sm ${interval === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
        >
          {t('monthly')}
        </button>
        <button
          type="button"
          onClick={() => {
            setInterval('yearly');
          }}
          className={`rounded px-3 py-1 text-sm ${interval === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
        >
          {t('yearlyWithDiscount')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const code = interval === 'monthly' ? tier.monthly : tier.yearly;
          const plan: PlanDefinition = PLAN_CATALOG[code];
          return (
            <Card key={tier.tier}>
              <CardHeader>
                <CardTitle>{tier.label}</CardTitle>
                <CardDescription>
                  ₺{formatLocaleNumber(plan.priceTry, locale)}{' '}
                  {interval === 'monthly' ? t('perMonth') : t('perYear')}
                  <span className="block text-xs text-muted-foreground">{t('vatNote')}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {tier.featureKeys.map((key) => (
                    <li key={key} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {t(`tiers.${key}`)}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  onClick={() => {
                    void handleSelect(code);
                  }}
                  disabled={loadingCode !== null}
                >
                  {loadingCode === code ? t('redirecting') : t('selectPlan')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        variant="outline"
        onClick={() => {
          router.back();
        }}
      >
        {tCommon('back')}
      </Button>
    </div>
  );
}
