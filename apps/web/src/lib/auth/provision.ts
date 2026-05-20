import 'server-only';

import { type User } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { startTrial } from '@yapiops/billing';
import { createSupabaseServiceClient } from '@yapiops/db/server';

/**
 * Creates the public.users + public.organizations + initial subscription rows
 * for an authenticated Supabase user. Idempotent: if a users row already
 * exists for the userId, it returns early without inserting duplicates.
 *
 * Used in two places:
 *   1. /auth/callback — first login after email confirmation (happy path).
 *   2. (dashboard)/layout — self-heal for orphan auth users whose callback
 *      flow was interrupted (e.g. wrong Site URL, deploy bug, etc.). Without
 *      this safety net the user gets stuck in an infinite login loop.
 */
export async function provisionFirstLogin(input: {
  user: User;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const service = createSupabaseServiceClient();

  // Idempotency: if the row already exists, no-op.
  const { data: existing } = await service
    .from('users')
    .select('id')
    .eq('id', input.user.id)
    .maybeSingle<{ id: string }>();
  if (existing) return;

  const fullName = (input.user.user_metadata.full_name as string | undefined) ?? null;
  const orgNameFromMeta = (input.user.user_metadata.org_name as string | undefined) ?? null;
  const orgName =
    orgNameFromMeta && orgNameFromMeta.trim().length > 0
      ? orgNameFromMeta
      : (input.user.email ?? 'My Office');
  const slug = `${slugify(orgName)}-${input.user.id.slice(0, 8)}`;

  const { data: org, error: orgErr } = await service
    .from('organizations')
    .insert({
      name: orgName,
      slug,
      subscription_tier: 'free',
      seat_count: 1,
    })
    .select('id')
    .single<{ id: string }>();

  if (orgErr || !org) {
    throw new Error(`Failed to create organization: ${orgErr?.message ?? 'unknown'}`);
  }

  const { error: userErr } = await service.from('users').insert({
    id: input.user.id,
    org_id: org.id,
    email: input.user.email ?? '',
    full_name: fullName,
    role: 'owner',
  });

  if (userErr) {
    throw new Error(`Failed to create user row: ${userErr.message}`);
  }

  // Service client's generic shape doesn't structurally match the SDK's
  // default tuple; identical at runtime since Database = any in Phase 0.
  const supabaseForLib = service as unknown as Parameters<typeof startTrial>[0];

  await startTrial(supabaseForLib, org.id);

  const audit = new AuditLogger(supabaseForLib, {
    orgId: org.id,
    userId: input.user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await audit.log('org.created', { resourceType: 'organization', resourceId: org.id });
  await audit.log('subscription.created', {
    resourceType: 'subscription',
    metadata: { plan_code: 'free', trial: true },
  });
  await audit.log('login.success', { metadata: { first_login: true } });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')

    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}
