'use client';

import { PLAN_CATALOG, type PlanDefinition } from '@yapiops/billing/plans';
import type { BillingInterval, PlanCode } from '@yapiops/db';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';

type PaidPlan = Exclude<PlanCode, 'free' | 'enterprise'>;

const TIERS = [
  { tier: 'solo', monthly: 'solo_monthly', yearly: 'solo_yearly', label: 'Solo', features: ['Ek3Pilot sınırsız', '5 RaporX/ay', '1 kullanıcı'] },
  { tier: 'office', monthly: 'office_monthly', yearly: 'office_yearly', label: 'Office', features: ['Tüm modüller', '50 rapor/ay', '3 kullanıcı'] },
  { tier: 'office_ai', monthly: 'office_ai_monthly', yearly: 'office_ai_yearly', label: 'Office + AI', features: ['Tüm modüller', 'TBDY-Copilot', 'Sınırsız rapor', '5 kullanıcı'] },
] as const;

export default function UpgradePage() {
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
        <h1 className="text-2xl font-bold">Plan Seç</h1>
        <p className="text-sm text-muted-foreground">
          14 gün ücretsiz deneme — istediğiniz zaman iptal edebilirsiniz.
        </p>
      </div>

      <div className="flex gap-2 rounded-md bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => { setInterval('monthly'); }}
          className={`rounded px-3 py-1 text-sm ${interval === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
        >
          Aylık
        </button>
        <button
          type="button"
          onClick={() => { setInterval('yearly'); }}
          className={`rounded px-3 py-1 text-sm ${interval === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
        >
          Yıllık (%15 indirim)
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const code = (interval === 'monthly' ? tier.monthly : tier.yearly);
          const plan: PlanDefinition = PLAN_CATALOG[code];
          return (
            <Card key={tier.tier}>
              <CardHeader>
                <CardTitle>{tier.label}</CardTitle>
                <CardDescription>
                  ₺{plan.priceTry.toLocaleString('tr-TR')} {interval === 'monthly' ? '/ ay' : '/ yıl'}
                  <span className="block text-xs text-muted-foreground">+ KDV %20</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
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
                  {loadingCode === code ? 'Yönlendiriliyor...' : 'Bu Plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" onClick={() => { router.back(); }}>
        Geri
      </Button>
    </div>
  );
}
