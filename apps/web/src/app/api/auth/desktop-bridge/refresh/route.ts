import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { createSupabaseServiceClient } from '@yapiops/db/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { BridgeRefreshSchema } from '../_schema';

import { captureRouteWarning } from '@/lib/sentry-helpers';

export const runtime = 'nodejs';

/**
 * Bridge'in `refresh_token`'ını yenileyen endpoint.
 *
 * Akış:
 *   1. Bridge POST { refresh_token } gönderir.
 *   2. Cloud Supabase service-role client ile `auth.refreshSession()` çağırır.
 *   3. Yeni session dönerse access_token + refresh_token + expires_in geri verilir
 *      (token rotation: refresh_token da yenilenir).
 *   4. Hata: 401 + audit + Sentry warning.
 *
 * NOT: Bu endpoint kullanıcı oturumu (cookie) gerektirmez — Bridge'in
 * stateless refresh çağrılarını destekler. Güvenlik refresh_token'ın kendi
 * geçerliliğine dayanır.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = BridgeRefreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseServiceClient();
  } catch (err) {
    return NextResponse.json(
      { error: 'server_misconfigured', detail: err instanceof Error ? err.message : null },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session) {
    const sentinel = process.env.SYSTEM_ORG_ID ?? '00000000-0000-0000-0000-000000000000';
    const audit = new AuditLogger(supabase, {
      orgId: sentinel,
      userId: null,
      ipAddress: (await headers()).get('x-forwarded-for'),
      userAgent: (await headers()).get('user-agent'),
    });
    await audit.log('bridge.token.refresh_failed', {
      resourceType: 'bridge_session',
      metadata: { error: error?.message ?? 'no_session' },
    });
    captureRouteWarning(`bridge token refresh failed: ${error?.message ?? 'no_session'}`, {
      route: '/api/auth/desktop-bridge/refresh',
      feature: 'ek3', // tag closely related
      extra: { reason: error?.message ?? 'no_session' },
    });
    return NextResponse.json(
      { error: 'refresh_failed', message: error?.message ?? 'no_session' },
      { status: 401 },
    );
  }

  // Best-effort audit (kullanıcı oturum bağlamı yok ama session.user.id var).
  const userId = data.session.user.id;
  // Org id'yi users tablosundan çek.
  const { data: userRow } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle<{ org_id: string | null }>();

  const orgId = userRow?.org_id ?? process.env.SYSTEM_ORG_ID ?? null;
  if (orgId) {
    const audit = new AuditLogger(supabase, {
      orgId,
      userId,
      ipAddress: (await headers()).get('x-forwarded-for'),
      userAgent: (await headers()).get('user-agent'),
    });
    await audit.log('bridge.token.refreshed', {
      resourceType: 'bridge_session',
      metadata: { userId },
    });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: 'bearer',
    user: { id: userId, email: data.session.user.email },
  });
}
