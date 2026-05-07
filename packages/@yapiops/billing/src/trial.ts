import { type SupabaseClient } from '@supabase/supabase-js';

export const TRIAL_DURATION_DAYS = 14 as const;

export function calculateTrialEnd(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + TRIAL_DURATION_DAYS);
  return end;
}

/**
 * Starts the 14-day free trial for a fresh organization. No card required —
 * only consumes a `subscriptions` row with `status='trialing'`. Called from
 * the auth callback on first signup.
 */
export async function startTrial(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date = new Date(),
): Promise<void> {
  const trialEnd = calculateTrialEnd(startDate);
  const { error } = await supabase.from('subscriptions').insert({
    org_id: orgId,
    plan_code: 'free',
    status: 'trialing',
    current_period_start: startDate.toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_end: trialEnd.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to start trial for org ${orgId}: ${error.message}`);
  }
}
