import { type SupabaseClient } from '@supabase/supabase-js';
import { canEditEk3 } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { Ek3EtabsImportSchema, mapEtabsToYapi } from '@yapiops/ek3';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  buildAuditContext,
  getAuditLogger,
  mergeFormData,
  type Ek3FormDataPartial,
  type Ek3Row,
} from '../_helpers';

export const runtime = 'nodejs';

/**
 * Receives an ETABS metadata payload from the desktop bridge (`apps/desktop-bridge`,
 * .NET 8 WPF). The bridge implementation lands in Faz 1 Hafta 8–9; this route
 * is the cloud-side contract.
 *
 * Behavior:
 *  - If `ek3FormId` is present in the payload, the matched fields are merged
 *    into the existing draft via `mergeFormData`.
 *  - Otherwise a new draft is created on the project. The caller (bridge UI)
 *    can then redirect the user to `/ek3pilot/[id]` to confirm.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = Ek3EtabsImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  // Verify the project belongs to the same org.
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', parsed.data.projectId)
    .maybeSingle<{ id: string; org_id: string }>();
  if (project?.org_id !== ctx.membership.orgId) {
    return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
  }

  const yapiFields = mapEtabsToYapi(parsed.data);
  // Strip the synthesized `dtsHint` and lift it to `dts` (engineer can override later).
  const { dtsHint, ...rest } = yapiFields;
  const formPatch: Ek3FormDataPartial = {
    yapi: {
      ...rest,
      ...(dtsHint != null ? { dts: dtsHint } : {}),
    },
  };

  if (parsed.data.ek3FormId) {
    const { data: existing } = await supabase
      .from('ek3_forms')
      .select('*')
      .eq('id', parsed.data.ek3FormId)
      .eq('org_id', ctx.membership.orgId)
      .maybeSingle<Ek3Row>();
    if (!existing) return NextResponse.json({ error: 'ek3_not_found' }, { status: 404 });

    const ownsForm = existing.created_by === ctx.user.id;
    if (!canEditEk3(ctx.membership.role, ownsForm)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const merged = mergeFormData(existing.form_data, formPatch);
    const { data: updated, error } = await supabase
      .from('ek3_forms')
      .update({ form_data: merged })
      .eq('id', existing.id)
      .select()
      .single<Ek3Row>();
    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? 'update_failed' }, { status: 500 });
    }

    const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
    await audit.log('ek3.etabs_imported', {
      resourceType: 'ek3_form',
      resourceId: existing.id,
      metadata: { fileName: parsed.data.etabs.fileName, bridgeVersion: parsed.data.bridgeVersion },
    });

    return NextResponse.json({ ek3Form: updated, mode: 'merged' });
  }

  // No ek3FormId — create a fresh draft.
  const { data: inserted, error } = await supabase
    .from('ek3_forms')
    .insert({
      project_id: parsed.data.projectId,
      org_id: ctx.membership.orgId,
      version: 1,
      status: 'draft',
      form_data: formPatch,
      created_by: ctx.user.id,
    })
    .select()
    .single<Ek3Row>();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 500 });
  }

  const audit = getAuditLogger(supabase, await buildAuditContext(ctx));
  await audit.log('ek3.etabs_imported', {
    resourceType: 'ek3_form',
    resourceId: inserted.id,
    metadata: {
      fileName: parsed.data.etabs.fileName,
      bridgeVersion: parsed.data.bridgeVersion,
      created: true,
    },
  });

  return NextResponse.json({ ek3Form: inserted, mode: 'created' }, { status: 201 });
}
