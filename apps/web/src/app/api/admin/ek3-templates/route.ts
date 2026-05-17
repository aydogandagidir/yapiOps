import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { canManageOrg } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import {
  type Ek3TemplateRow,
  activateTemplate,
  recordNewTemplate,
  sha256OfBytes,
} from '@yapiops/ek3/template-source';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { captureServerEvent, flushPostHog } from '@/lib/posthog-server';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET() {
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
  const { data, error } = await supabase
    .from('ek3_templates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: (data ?? []) as Ek3TemplateRow[] });
}

/**
 * Manuel PDF upload — multipart/form-data:
 *   - file: PDF bytes (zorunlu)
 *   - version: string (zorunlu, ör. "2026-01-15-revize")
 *   - notes: string (opsiyonel)
 *   - activate: 'true' | 'false' (varsayılan 'true')
 */
export async function POST(request: Request) {
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

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const file = form.get('file');
  const version = form.get('version');
  const notes = form.get('notes');
  const activate = form.get('activate') !== 'false';

  if (!(file instanceof File) || typeof version !== 'string' || version.length === 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Sanity: PDF magic header.
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    return NextResponse.json({ error: 'not_a_pdf' }, { status: 400 });
  }

  const sha256 = sha256OfBytes(bytes);
  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  // Same hash already exists?
  const { data: existing } = await supabase
    .from('ek3_templates')
    .select('*')
    .eq('sha256', sha256)
    .maybeSingle<Ek3TemplateRow>();

  let templateId: string;
  if (existing) {
    templateId = existing.id;
  } else {
    const recorded = await recordNewTemplate(supabase, {
      bytes,
      sha256,
      size: bytes.length,
      source: 'manual_upload',
      version,
      uploadedBy: ctx.user.id,
      notes: typeof notes === 'string' ? notes : undefined,
    });
    templateId = recorded.id;
  }

  if (activate) {
    await activateTemplate(supabase, templateId);
  }

  const h = await headers();
  const audit = new AuditLogger(supabase, {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
  await audit.log('ek3_template.uploaded', {
    resourceType: 'ek3_template',
    resourceId: templateId,
    metadata: { sha256, size: bytes.length, version, deduped: Boolean(existing) },
  });
  if (activate) {
    await audit.log('ek3_template.activated', {
      resourceType: 'ek3_template',
      resourceId: templateId,
      metadata: { sha256, source: existing ? existing.source : 'manual_upload' },
    });
  }

  captureServerEvent({
    distinctId: ctx.membership.orgId,
    event: 'ek3_template_uploaded',
    userId: ctx.user.id,
    properties: {
      templateId,
      sha256,
      size: bytes.length,
      version,
      deduped: Boolean(existing),
      activated: activate,
    },
  });
  await flushPostHog();

  return NextResponse.json({ id: templateId, deduped: Boolean(existing), activated: activate });
}
