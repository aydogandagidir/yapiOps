import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { checkQuota, getActivePlanCode, recordUsage } from '../src/quota';

interface MockSupabaseSetup {
  planCode?: string | null;
  monthlyUsage?: number;
  insertError?: { message: string } | null;
}

function mockSupabase(setup: MockSupabaseSetup): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: setup.planCode != null ? { plan_code: setup.planCode } : null,
            error: null,
          }),
        };
      }
      if (table === 'usage_records') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({
            count: setup.monthlyUsage ?? 0,
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: setup.insertError ?? null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;
}

describe('getActivePlanCode', () => {
  it('returns plan_code when subscription exists', async () => {
    const supabase = mockSupabase({ planCode: 'office_monthly' });
    const code = await getActivePlanCode(supabase, 'org-1');
    expect(code).toBe('office_monthly');
  });

  it('falls back to "free" when no subscription row', async () => {
    const supabase = mockSupabase({ planCode: null });
    const code = await getActivePlanCode(supabase, 'org-1');
    expect(code).toBe('free');
  });
});

describe('checkQuota — Free tier (3 Ek-3/ay)', () => {
  it('allows when usage is below limit', async () => {
    const supabase = mockSupabase({ planCode: 'free', monthlyUsage: 2 });
    const result = await checkQuota(supabase, 'org-1', 'ek3Generations');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.used).toBe(2);
  });

  it('rejects when usage hits the cap', async () => {
    const supabase = mockSupabase({ planCode: 'free', monthlyUsage: 3 });
    const result = await checkQuota(supabase, 'org-1', 'ek3Generations');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('limit_reached');
  });

  it('rejects RaporX entirely on Free tier (limit=0)', async () => {
    const supabase = mockSupabase({ planCode: 'free' });
    const result = await checkQuota(supabase, 'org-1', 'reports');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('plan_excludes');
  });
});

describe('checkQuota — Office tier (sınırsız Ek-3, 50 RaporX)', () => {
  it('allows unlimited Ek-3 generations', async () => {
    const supabase = mockSupabase({ planCode: 'office_monthly', monthlyUsage: 999 });
    const result = await checkQuota(supabase, 'org-1', 'ek3Generations');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  it('caps RaporX at 50/month', async () => {
    const supabase = mockSupabase({ planCode: 'office_monthly', monthlyUsage: 50 });
    const result = await checkQuota(supabase, 'org-1', 'reports');
    expect(result.allowed).toBe(false);
  });
});

describe('checkQuota — Office+AI tier (Copilot 200/ay)', () => {
  it('allows Copilot under 200', async () => {
    const supabase = mockSupabase({ planCode: 'office_ai_monthly', monthlyUsage: 50 });
    const result = await checkQuota(supabase, 'org-1', 'copilotQueries');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(200);
  });

  it('rejects Copilot at 200', async () => {
    const supabase = mockSupabase({ planCode: 'office_ai_monthly', monthlyUsage: 200 });
    const result = await checkQuota(supabase, 'org-1', 'copilotQueries');
    expect(result.allowed).toBe(false);
  });
});

describe('recordUsage', () => {
  it('throws when insert fails', async () => {
    const supabase = mockSupabase({
      monthlyUsage: 0,
      insertError: { message: 'unique violation' },
    });
    await expect(
      recordUsage(supabase, {
        orgId: 'org-1',
        userId: 'user-1',
        feature: 'ek3.generated',
      }),
    ).rejects.toThrow(/unique violation/);
  });

  it('resolves when insert succeeds', async () => {
    const supabase = mockSupabase({ monthlyUsage: 0 });
    await expect(
      recordUsage(supabase, {
        orgId: 'org-1',
        userId: 'user-1',
        feature: 'ek3.generated',
        resourceId: 'ek3-1',
      }),
    ).resolves.toBeUndefined();
  });
});
