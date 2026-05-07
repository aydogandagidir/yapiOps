import { createSupabaseServiceClient } from '@yapiops/db/server';
import { NextResponse } from 'next/server';

import { runSync } from '../../admin/ek3-templates/sync/route';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Vercel Cron endpoint. Authorization: Bearer ${CRON_SECRET}.
 *
 * Vercel'in cron infrastructure'ı `Authorization: Bearer <CRON_SECRET>`
 * header'ı ile çağırır; secret env değişkenidir. Bu route service-role
 * Supabase client kullanır çünkü cron'un kullanıcı oturumu yok.
 *
 * Audit log için sentinel orgId kullanılır (gerçek bir org değil, sadece
 * `audit_logs` tablosuna kayıt için). `ek3_templates` global olduğundan
 * RLS kısıtlamasına takılmamak için service-role yeterlidir.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const sentinelOrg = process.env.SYSTEM_ORG_ID ?? '00000000-0000-0000-0000-000000000000';

  return runSync(supabase, {
    orgId: sentinelOrg,
    userId: null,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: 'vercel-cron',
  });
}
