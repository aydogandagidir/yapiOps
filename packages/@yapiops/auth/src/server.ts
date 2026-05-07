import 'server-only';

import { type Session, type User } from '@supabase/supabase-js';
import { createSupabaseServerClient, type CookieStore } from '@yapiops/db/server';
import { type OrgRole } from '@yapiops/db/types';

export interface OrgMembership {
  orgId: string;
  role: OrgRole;
  fullName: string | null;
  imoNumber: string | null;
}

export interface AuthContext {
  user: User;
  session: Session;
  membership: OrgMembership;
}

/**
 * Returns the current Supabase session, or null if unauthenticated. Does NOT
 * redirect — use `requireUser()` for protected routes.
 */
export async function getServerSession(cookieStore: CookieStore): Promise<Session | null> {
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Asserts the user is authenticated and returns their session. Throws an
 * `AuthRequiredError` if not — wire this to a redirect in your route layer.
 */
export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

export class ForbiddenError extends Error {
  constructor(public readonly requiredRoles: readonly OrgRole[]) {
    super(`Forbidden: requires one of [${requiredRoles.join(', ')}]`);
    this.name = 'ForbiddenError';
  }
}

export async function requireUser(cookieStore: CookieStore): Promise<{ user: User; session: Session }> {
  const session = await getServerSession(cookieStore);
  if (!session) {
    throw new AuthRequiredError();
  }
  return { user: session.user, session };
}

/**
 * Loads the user's organization membership row. Returns null if the user has
 * no membership yet (e.g. just signed up, callback hasn't created the org).
 */
export async function getOrgMembership(
  cookieStore: CookieStore,
  userId: string,
): Promise<OrgMembership | null> {
  const supabase = createSupabaseServerClient(cookieStore);
  const { data, error } = await supabase
    .from('users')
    .select('org_id, role, full_name, imo_number')
    .eq('id', userId)
    .maybeSingle<{
      org_id: string;
      role: OrgRole;
      full_name: string | null;
      imo_number: string | null;
    }>();

  if (error || !data) return null;

  return {
    orgId: data.org_id,
    role: data.role,
    fullName: data.full_name,
    imoNumber: data.imo_number,
  };
}

/**
 * Resolves the full auth context: session + user + org membership. Throws
 * `AuthRequiredError` if unauthenticated, `ForbiddenError` if the user has
 * no membership row.
 */
export async function requireAuthContext(cookieStore: CookieStore): Promise<AuthContext> {
  const { user, session } = await requireUser(cookieStore);
  const membership = await getOrgMembership(cookieStore, user.id);
  if (!membership) {
    throw new ForbiddenError(['owner', 'admin', 'engineer', 'auditor']);
  }
  return { user, session, membership };
}

/**
 * Asserts the current user holds one of the allowed roles in their org.
 * Throws `ForbiddenError` otherwise.
 */
export async function requireOrgRole(
  cookieStore: CookieStore,
  allowedRoles: readonly OrgRole[],
): Promise<AuthContext> {
  const ctx = await requireAuthContext(cookieStore);
  if (!allowedRoles.includes(ctx.membership.role)) {
    throw new ForbiddenError(allowedRoles);
  }
  return ctx;
}
