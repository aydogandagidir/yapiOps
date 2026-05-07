import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { activateTemplate, type Ek3TemplateRow } from '@yapiops/ek3';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Eski sürüme manuel geri dönüş. Bakanlık form değişikliği ofislerimizde
 * sorun çıkarırsa admin önceki sürüme döndürür.
 */
export async function POST(_req: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: row } = await supabase
    .from('ek3_templates')
    .select('id, sha256, source')
    .eq('id', id)
    .maybeSingle<Pick<Ek3TemplateRow, 'id' | 'sha256' | 'source'>>();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await activateTemplate(supabase, row.id);

  const h = await headers();
  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
  await audit.log('ek3_template.activated', {
    resourceType: 'ek3_template',
    resourceId: row.id,
    metadata: { sha256: row.sha256, source: row.source, manualRollback: true },
  });

  return NextResponse.json({ ok: true, activeId: row.id });
}
