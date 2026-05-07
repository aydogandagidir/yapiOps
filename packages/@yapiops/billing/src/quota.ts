import { type SupabaseClient } from '@supabase/supabase-js';
import type { PlanCode, SubscriptionTier } from '@yapiops/db';

import { getPlan } from './plans';

/**
 * Per-feature monthly quotas. Mirrors CLAUDE.md §12 pricing table for paid
 * features and the 3-projects/month Ek-3 cap on the free tier.
 *
 * `null` means "unlimited within fair use" (Office+AI / Enterprise).
 */
export interface FeatureQuotas {
  /** Generated Ek-3 PDFs per month. */
  ek3Generations: number | null;
  /** RaporX reports per month. */
  reports: number | null;
  /** TBDY-Copilot AI queries per month. */
  copilotQueries: number | null;
}

const QUOTAS_BY_TIER: Record<SubscriptionTier, FeatureQuotas> = {
  free: { ek3Generations: 3, reports: 0, copilotQueries: 0 },
  solo: { ek3Generations: null, reports: 5, copilotQueries: 0 },
  office: { ek3Generations: null, reports: 50, copilotQueries: 0 },
  office_ai: { ek3Generations: null, reports: null, copilotQueries: 200 },
  enterprise: { ek3Generations: null, reports: null, copilotQueries: null },
};

export type QuotaFeature = keyof FeatureQuotas;

export type UsageFeatureCode = 'ek3.generated' | 'report.generated' | 'copilot.query';

const FEATURE_TO_USAGE: Record<QuotaFeature, UsageFeatureCode> = {
  ek3Generations: 'ek3.generated',
  reports: 'report.generated',
  copilotQueries: 'copilot.query',
};

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  feature: QuotaFeature;
  /** Surfaced to UI via i18n; the route layer translates the message. */
  reason?: 'plan_excludes' | 'limit_reached';
}

/**
 * Returns the active plan code for an org (defaults to 'free' if no
 * subscription row exists yet). Reads the most recent subscription row.
 */
export async function getActivePlanCode(
  supabase: SupabaseClient,
  orgId: string,
): Promise<PlanCode> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_code')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ plan_code: PlanCode }>();
  return data?.plan_code ?? 'free';
}

/**
 * Counts `usage_records` rows for the given feature within the current
 * calendar month (UTC). Cheap because of the
 * `(org_id, feature, date_trunc('month', created_at))` index.
 */
export async function getMonthlyUsage(
  supabase: SupabaseClient,
  orgId: string,
  feature: UsageFeatureCode,
  now: Date = new Date(),
): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { count } = await supabase
    .from('usage_records')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('feature', feature)
    .gte('created_at', start.toISOString());
  return count ?? 0;
}

/**
 * Computes whether the org can perform another `feature` action this month.
 * Pure read — does NOT increment usage. Call `recordUsage()` after the action
 * succeeds.
 */
export async function checkQuota(
  supabase: SupabaseClient,
  orgId: string,
  feature: QuotaFeature,
): Promise<QuotaCheckResult> {
  const planCode = await getActivePlanCode(supabase, orgId);
  const plan = getPlan(planCode);
  const tierQuotas = QUOTAS_BY_TIER[plan.tier];
  const limit = tierQuotas[feature];

  // Plan excludes the feature entirely (e.g. raporx on free).
  if (limit === 0) {
    return { allowed: false, used: 0, limit: 0, feature, reason: 'plan_excludes' };
  }

  // Unlimited.
  if (limit === null) {
    return { allowed: true, used: 0, limit: null, feature };
  }

  const used = await getMonthlyUsage(supabase, orgId, FEATURE_TO_USAGE[feature]);
  if (used >= limit) {
    return { allowed: false, used, limit, feature, reason: 'limit_reached' };
  }
  return { allowed: true, used, limit, feature };
}

export interface RecordUsageInput {
  orgId: string;
  userId?: string | null;
  feature: UsageFeatureCode;
  resourceId?: string;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Inserts a `usage_records` row. Should be called on every metered action
 * (PDF generation, AI query, report generation). Failures throw — the route
 * layer decides whether to fail the request or just log to Sentry.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  input: RecordUsageInput,
): Promise<void> {
  const { error } = await supabase.from('usage_records').insert({
    org_id: input.orgId,
    user_id: input.userId ?? null,
    feature: input.feature,
    resource_id: input.resourceId ?? null,
    cost_usd: input.costUsd ?? null,
    metadata: input.metadata ?? null,
  });
  if (error) {
    throw new Error(`recordUsage failed: ${error.message}`);
  }
}
