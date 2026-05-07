import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import {
  activateTemplate,
  compareToActive,
  fetchOfficialTemplate,
  recordNewTemplate,
} from '@yapiops/ek3';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { captureServerEvent, flushPostHog } from '@/lib/posthog-server';
import { breadcrumbEk3, captureRouteWarning } from '@/lib/sentry-helpers';

export const runtime = 'nodejs';
// 30s — Bakanlık endpoint'i yavaş cevap verebilir.
export const maxDuration = 30;

/**
 * Manuel "şimdi senkronize et" — admin UI'daki butondan tetiklenir. Cron
 * versiyonu için `/api/cron/ek3-template-sync` ayrı dosyada (Authorization
 * header gerekiyor).
 */
export async function POST() {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!canManageOrg(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  return runSync(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: (await headers()).get('x-forwarded-for'),
    userAgent: (await headers()).get('user-agent'),
  });
}

interface AuditMeta {
  orgId: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function runSync(
  supabase: SupabaseClient,
  auditMeta: AuditMeta,
): Promise<NextResponse> {
  const audit = new AuditLogger(supabase, auditMeta);

  let fetched;
  try {
    fetched = await fetchOfficialTemplate();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch_failed';
    await audit.log('ek3_template.sync_failed', {
      resourceType: 'ek3_template',
      metadata: { error: message },
    });
    captureRouteWarning(`ek3 template sync failed: ${message}`, {
      route: '/api/admin/ek3-templates/sync',
      feature: 'ek3_template',
      orgId: auditMeta.orgId,
      extra: { error: message },
    });
    await flushPostHog();
    return NextResponse.json({ status: 'fetch_failed', error: message }, { status: 502 });
  }

  const cmp = await compareToActive(supabase, fetched.sha256);
  if (cmp.status === 'unchanged') {
    return NextResponse.json({
      status: 'unchanged',
      activeId: cmp.activeId,
      sha256: fetched.sha256,
    });
  }

  // Versiyon etiketi: Bakanlık dosyasından çıkarmaya çalışalım, sonuçta
  // sourceUrl + tarih.
  const version = deriveVersion(fetched.sourceUrl, fetched.fetchedAt);
  const recorded = await recordNewTemplate(supabase, {
    bytes: fetched.bytes,
    sha256: fetched.sha256,
    size: fetched.size,
    source: 'official_fetch',
    sourceUrl: fetched.sourceUrl,
    version,
    notes: cmp.status === 'first' ? 'Initial official sync' : 'Auto-fetched update',
  });

  await activateTemplate(supabase, recorded.id);

  await audit.log('ek3_template.synced', {
    resourceType: 'ek3_template',
    resourceId: recorded.id,
    metadata: {
      sha256: fetched.sha256,
      sourceUrl: fetched.sourceUrl,
      previousActive: cmp.status === 'new' ? cmp.activeId : null,
    },
  });
  await audit.log('ek3_template.activated', {
    resourceType: 'ek3_template',
    resourceId: recorded.id,
    metadata: { sha256: fetched.sha256, source: 'official_fetch' },
  });

  breadcrumbEk3({
    action: 'template_synced',
    orgId: auditMeta.orgId,
    resourceId: recorded.id,
    data: { sha256: fetched.sha256, sourceUrl: fetched.sourceUrl, status: cmp.status },
  });
  captureServerEvent({
    distinctId: auditMeta.orgId,
    event: 'ek3_template_synced',
    userId: auditMeta.userId,
    properties: {
      sha256: fetched.sha256,
      sourceUrl: fetched.sourceUrl,
      version,
      status: cmp.status,
    },
  });
  await flushPostHog();

  return NextResponse.json({
    status: cmp.status, // 'first' | 'new'
    id: recorded.id,
    sha256: fetched.sha256,
    sourceUrl: fetched.sourceUrl,
    version,
  });
}

function deriveVersion(sourceUrl: string, fetchedAt: Date): string {
  // URL'de tarih var mı kontrol et (ör. ek-3-formu_20190530.pdf).
  const match = /(\d{4})(\d{2})(\d{2})/.exec(sourceUrl);
  if (match) {
    return `${match[1] ?? ''}-${match[2] ?? ''}-${match[3] ?? ''}`;
  }
  return fetchedAt.toISOString().slice(0, 10);
}
