import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageFirmaSablon } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { FirmaSablonCreateSchema } from '@yapiops/ek3';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface FirmaSablonRow {
  id: string;
  org_id: string;
  type: 'muteahhit' | 'denetim';
  name: string;
  data: unknown;
  created_at: string;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  let q = supabase
    .from('firma_sablonlari')
    .select('id, org_id, type, name, data, created_at')
    .eq('org_id', ctx.membership.orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (type === 'muteahhit' || type === 'denetim') {
    q = q.eq('type', type);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sablonlar: data ?? [] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!canManageFirmaSablon(ctx.membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = FirmaSablonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: inserted, error } = await supabase
    .from('firma_sablonlari')
    .insert({
      org_id: ctx.membership.orgId,
      type: parsed.data.type,
      name: parsed.data.name,
      data: parsed.data.data,
    })
    .select()
    .single<FirmaSablonRow>();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 500 });
  }

  const h = await headers();
  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
  await audit.log('firma_sablon.created', {
    resourceType: 'firma_sablon',
    resourceId: inserted.id,
    metadata: { type: inserted.type, name: inserted.name },
  });

  return NextResponse.json({ sablon: inserted }, { status: 201 });
}
