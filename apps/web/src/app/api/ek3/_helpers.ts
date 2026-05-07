import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger, type AuditContext } from '@yapiops/audit';
import { type AuthContext } from '@yapiops/auth/server';
import type { Ek3FormData } from '@yapiops/ek3';
import { headers } from 'next/headers';

/**
 * Lightweight helpers shared across `app/api/ek3/**` routes. They factor out
 * (a) audit context construction, (b) JSON-merge for partial form_data
 * autosave, and (c) row typing.
 */

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/**
 * Storage shape for `ek3_forms.form_data` JSONB. Every block (proje, yapi, …)
 * may be partially filled while the form is in the `draft` status; only when
 * the user clicks "Generate PDF" does the full `Ek3FormDataSchema` apply.
 */
export type Ek3FormDataPartial = DeepPartial<Ek3FormData>;

export async function buildAuditContext(ctx: AuthContext): Promise<AuditContext> {
  const h = await headers();
  return {
    orgId: ctx.membership.orgId,
    userId: ctx.user.id,
    ipAddress: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  };
}

export function getAuditLogger(supabase: SupabaseClient, ctx: AuditContext): AuditLogger {
  return new AuditLogger(supabase, ctx);
}

/**
 * Deep-merges a partial form_data patch onto the existing JSONB. Each top-level
 * key (proje, yapi, …) merges its sub-fields; passing `undefined` leaves the
 * existing block untouched.
 */
export function mergeFormData(
  existing: Ek3FormDataPartial | null | undefined,
  patch: Ek3FormDataPartial,
): Ek3FormDataPartial {
  const base: Ek3FormDataPartial = existing ?? {};
  const merged: Ek3FormDataPartial = { ...base };
  for (const key of Object.keys(patch) as (keyof Ek3FormDataPartial)[]) {
    const patchBlock = patch[key];
    if (patchBlock == null) continue;
    const existingBlock = base[key];
    merged[key] = {
      ...((existingBlock ?? {})),
      ...(patchBlock),
    };
  }
  return merged;
}

export interface Ek3Row {
  id: string;
  org_id: string;
  project_id: string;
  version: number;
  status: 'draft' | 'completed' | 'signed' | 'superseded';
  form_data: Ek3FormDataPartial | null;
  pdf_url: string | null;
  generated_at: string | null;
  superseded_by: string | null;
  supersedes: string | null;
  revision_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
