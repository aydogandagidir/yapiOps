import { describe, expect, it } from 'vitest';

import { PLAN_CATALOG, VAT_RATE, calculateVat, getPlan } from '../src/plans';
import { TRIAL_DURATION_DAYS, calculateTrialEnd } from '../src/trial';

describe('plans', () => {
  it('catalog has every PlanCode', () => {
    const codes = Object.keys(PLAN_CATALOG);
    expect(codes).toContain('free');
    expect(codes).toContain('solo_monthly');
    expect(codes).toContain('solo_yearly');
    expect(codes).toContain('office_monthly');
    expect(codes).toContain('office_yearly');
    expect(codes).toContain('office_ai_monthly');
    expect(codes).toContain('office_ai_yearly');
    expect(codes).toContain('enterprise');
  });

  it('yearly plans apply 15% discount vs 12 months of monthly', () => {
    const soloMonthlyAnnualized = PLAN_CATALOG.solo_monthly.priceTry * 12;
    const soloYearly = PLAN_CATALOG.solo_yearly.priceTry;
    expect(soloYearly).toBeLessThan(soloMonthlyAnnualized);
    // Within 1% of expected 15% discount.
    const expected = soloMonthlyAnnualized * 0.85;
    expect(Math.abs(soloYearly - expected) / expected).toBeLessThan(0.01);
  });

  it('Office+AI has Copilot enabled, Office does not', () => {
    expect(PLAN_CATALOG.office_monthly.features.copilot).toBe(false);
    expect(PLAN_CATALOG.office_ai_monthly.features.copilot).toBe(true);
  });

  it('getPlan returns the same reference as the catalog', () => {
    expect(getPlan('solo_monthly')).toBe(PLAN_CATALOG.solo_monthly);
  });
});

describe('VAT calculation', () => {
  it('VAT_RATE is 20%', () => {
    expect(VAT_RATE).toBe(0.2);
  });

  it('calculates VAT and total correctly', () => {
    const result = calculateVat(1250);
    expect(result.priceExclVat).toBe(1250);
    expect(result.vat).toBe(250);
    expect(result.total).toBe(1500);
  });

  it('rounds VAT to 2 decimal places', () => {
    const result = calculateVat(123.456);
    expect(result.vat).toBe(24.69);
  });
});

describe('trial', () => {
  it('trial duration is 14 days', () => {
    expect(TRIAL_DURATION_DAYS).toBe(14);
  });

  it('calculateTrialEnd adds exactly 14 days', () => {
    const start = new Date('2026-05-06T00:00:00.000Z');
    const end = calculateTrialEnd(start);
    expect(end.toISOString()).toBe('2026-05-20T00:00:00.000Z');
  });

  it('calculateTrialEnd does not mutate input', () => {
    const start = new Date('2026-05-06T00:00:00.000Z');
    const startCopy = new Date(start.getTime());
    calculateTrialEnd(start);
    expect(start.getTime()).toBe(startCopy.getTime());
  });
});
