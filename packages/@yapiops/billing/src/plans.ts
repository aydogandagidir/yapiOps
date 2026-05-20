import type { BillingInterval, PlanCode, SubscriptionTier } from '@yapiops/db';

export interface PlanDefinition {
  code: PlanCode;
  tier: SubscriptionTier;
  interval: BillingInterval | null;
  /** Price in TRY, KDV (VAT) excluded. KDV %20 added at invoice time. */
  priceTry: number;
  /** Iyzico-side reference code; populated from env at runtime. */
  iyzicoRefEnvKey: string | null;
  seatLimit: number;
  features: {
    ek3: boolean;
    raporx: boolean;
    spektrumhub: boolean;
    copilot: boolean;
    monthlyReportLimit: number | null;
  };
}

/**
 * Plan catalog — mirrors CLAUDE.md §12 pricing table.
 *
 * Yearly variants apply a 15% discount baked into `priceTry` (12 months × monthly × 0.85).
 */
export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  free: {
    code: 'free',
    tier: 'free',
    interval: null,
    priceTry: 0,
    iyzicoRefEnvKey: null,
    seatLimit: 1,
    features: {
      ek3: true,
      raporx: false,
      spektrumhub: false,
      copilot: false,
      monthlyReportLimit: 3,
    },
  },
  solo_monthly: {
    code: 'solo_monthly',
    tier: 'solo',
    interval: 'monthly',
    priceTry: 1500,
    iyzicoRefEnvKey: 'IYZICO_PLAN_SOLO_MONTHLY',
    seatLimit: 1,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: false,
      copilot: false,
      monthlyReportLimit: 5,
    },
  },
  solo_yearly: {
    code: 'solo_yearly',
    tier: 'solo',
    interval: 'yearly',
    priceTry: 15300,
    iyzicoRefEnvKey: 'IYZICO_PLAN_SOLO_YEARLY',
    seatLimit: 1,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: false,
      copilot: false,
      monthlyReportLimit: 5,
    },
  },
  office_monthly: {
    code: 'office_monthly',
    tier: 'office',
    interval: 'monthly',
    priceTry: 2500,
    iyzicoRefEnvKey: 'IYZICO_PLAN_OFFICE_MONTHLY',
    seatLimit: 3,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: true,
      copilot: false,
      monthlyReportLimit: 50,
    },
  },
  office_yearly: {
    code: 'office_yearly',
    tier: 'office',
    interval: 'yearly',
    priceTry: 25500,
    iyzicoRefEnvKey: 'IYZICO_PLAN_OFFICE_YEARLY',
    seatLimit: 3,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: true,
      copilot: false,
      monthlyReportLimit: 50,
    },
  },
  office_ai_monthly: {
    code: 'office_ai_monthly',
    tier: 'office_ai',
    interval: 'monthly',
    priceTry: 3500,
    iyzicoRefEnvKey: 'IYZICO_PLAN_OFFICE_AI_MONTHLY',
    seatLimit: 5,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: true,
      copilot: true,
      monthlyReportLimit: null,
    },
  },
  office_ai_yearly: {
    code: 'office_ai_yearly',
    tier: 'office_ai',
    interval: 'yearly',
    priceTry: 35700,
    iyzicoRefEnvKey: 'IYZICO_PLAN_OFFICE_AI_YEARLY',
    seatLimit: 5,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: true,
      copilot: true,
      monthlyReportLimit: null,
    },
  },
  enterprise: {
    code: 'enterprise',
    tier: 'enterprise',
    interval: null,
    priceTry: 0,
    iyzicoRefEnvKey: null,
    seatLimit: 10,
    features: {
      ek3: true,
      raporx: true,
      spektrumhub: true,
      copilot: true,
      monthlyReportLimit: null,
    },
  },
};

export const VAT_RATE = 0.2 as const;

export function calculateVat(priceExclVat: number): {
  priceExclVat: number;
  vat: number;
  total: number;
} {
  const vat = Math.round(priceExclVat * VAT_RATE * 100) / 100;
  return { priceExclVat, vat, total: priceExclVat + vat };
}

export function getPlan(code: PlanCode): PlanDefinition {
  return PLAN_CATALOG[code];
}
