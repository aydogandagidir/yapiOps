import { type SupabaseClient } from '@supabase/supabase-js';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * Kullanıcı bildirim tercihlerini günceller. JSONB merge ile mevcut
 * preferences objesi üzerine `email_ek3_generated` / `email_weekly_digest`
 * alanları yazılır.
 */
const PreferencesPatchSchema = z.object({
  email_ek3_generated: z.boolean().optional(),
  email_weekly_digest: z.boolean().optional(),
});

interface UserPreferencesRow {
  preferences: Record<string, unknown> | null;
}

export async function GET() {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
  const { data } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', ctx.user.id)
    .maybeSingle<UserPreferencesRow>();

  return NextResponse.json({ preferences: data?.preferences ?? {} });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = PreferencesPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;

  const { data: existing } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', ctx.user.id)
    .maybeSingle<UserPreferencesRow>();

  const merged = {
    ...((existing?.preferences as Record<string, unknown> | null) ?? {}),
    ...parsed.data,
  };

  const { data: updated, error } = await supabase
    .from('users')
    .update({ preferences: merged })
    .eq('id', ctx.user.id)
    .select('preferences')
    .single<UserPreferencesRow>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: updated.preferences });
}
