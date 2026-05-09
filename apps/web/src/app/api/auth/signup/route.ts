import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';


const signupSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
  kvkkConsent: z.literal(true),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { fullName, email, password, orgName } = parsed.data;

  const headersList = await headers();
  const origin = headersList.get('origin') ?? headersList.get('host');
  const redirectTo = `${origin?.startsWith('http') ? origin : `https://${origin ?? 'yapiops.com'}`}/auth/callback`;

  let supabase;
  try {
    supabase = createSupabaseServerClient(await cookies());
  } catch (err) {
    // createSupabaseServerClient throws when NEXT_PUBLIC_SUPABASE_URL or
    // NEXT_PUBLIC_SUPABASE_ANON_KEY are missing — the deployment is
    // misconfigured. Surface a 503 with a clear hint so the UI can show
    // something better than a generic "unexpected error".
    const message = err instanceof Error ? err.message : 'Configuration error';
    return NextResponse.json(
      {
        error: 'service_unavailable',
        message,
        hint: 'Supabase environment variables are not configured for this deployment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel for all environments and redeploy.',
      },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: fullName,
        org_name: orgName,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // The actual organization + users row is created in /auth/callback once
  // the email is verified. This keeps the DB free of unverified accounts.
  return NextResponse.json({ ok: true });
}
