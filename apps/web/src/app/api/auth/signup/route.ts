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

  const supabase = createSupabaseServerClient(await cookies());

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
