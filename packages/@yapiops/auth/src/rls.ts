/**
 * Row-level security sanity guards. Postgres RLS policies are the source of
 * truth (see `infrastructure/supabase/migrations/0001_initial_schema.sql`),
 * but these helpers add defense-in-depth at the application layer.
 */

/**
 * Throws if `orgId` doesn't match the expected current-user org. Use in
 * server actions/route handlers right after `requireUser()` to catch logic
 * bugs that try to query across org boundaries.
 */
export function assertSameOrg(actualOrgId: string, expectedOrgId: string): void {
  if (actualOrgId !== expectedOrgId) {
    throw new Error(
      `RLS guard: expected orgId=${expectedOrgId} but got ${actualOrgId}. ` +
        `This is either a bug or an attempt to access cross-org data.`,
    );
  }
}

/**
 * Returns true if the resource's `org_id` matches the user's. Cheap pre-check
 * before issuing a write to avoid the round trip to Postgres.
 */
export function isInOrg(resourceOrgId: string, userOrgId: string): boolean {
  return resourceOrgId === userOrgId;
}
