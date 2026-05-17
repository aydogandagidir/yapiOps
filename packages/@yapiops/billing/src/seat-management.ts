import { type SupabaseClient } from '@supabase/supabase-js';
import type { OrgRole } from '@yapiops/db';

import { getPlan } from './plans';

export interface SeatUsage {
  used: number;
  limit: number;
  available: number;
}

/**
 * Returns current seat usage for an org. Counts active assignments in
 * `seat_assignments` and reads the plan's seat limit from the catalog.
 */
export async function getSeatUsage(supabase: SupabaseClient, orgId: string): Promise<SeatUsage> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_code')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ plan_code: string }>();

  const plan = sub?.plan_code
    ? getPlan(sub.plan_code as Parameters<typeof getPlan>[0])
    : getPlan('free');

  const { count } = await supabase
    .from('seat_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  const used = count ?? 0;
  return {
    used,
    limit: plan.seatLimit,
    available: Math.max(0, plan.seatLimit - used),
  };
}

/**
 * Assigns a seat to a user with the given role. Throws if the org has hit
 * its seat limit.
 */
export async function assignSeat(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  const usage = await getSeatUsage(supabase, orgId);
  if (usage.available <= 0) {
    throw new Error(
      `Seat limit reached for org ${orgId} (${String(usage.used)}/${String(usage.limit)})`,
    );
  }

  const { error } = await supabase.from('seat_assignments').insert({
    org_id: orgId,
    user_id: userId,
    role,
  });

  if (error) {
    throw new Error(`Failed to assign seat: ${error.message}`);
  }
}

export async function revokeSeat(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('seat_assignments')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to revoke seat: ${error.message}`);
  }
}
