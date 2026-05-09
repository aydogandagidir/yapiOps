import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Cookie store contract — accepts Next.js `cookies()` and similar adapters.
 * Loose by design because Next's `ReadonlyRequestCookies` has overloaded
 * set/delete signatures that don't structurally match a single function type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CookieStoreSetter = (...args: any[]) => any;

export interface CookieStore {
  get(name: string): { value: string } | undefined;
  getAll?: () => Array<{ name: string; value: string }>;
  set?: CookieStoreSetter;
  delete?: CookieStoreSetter;
}

/**
 * Server-side Supabase client. Pass the Next.js cookie store from `cookies()`
 * (or a Route Handler equivalent) to wire up RLS-aware sessions.
 *
 * Usage in a Server Component:
 *   import { cookies } from 'next/headers';
 *   const supabase = createSupabaseServerClient(await cookies());
 */
export function createSupabaseServerClient(cookieStore: CookieStore) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
    );
  }

  return createSSRClient(url, anonKey, {
    cookies: {
      getAll() {
        // Read every request cookie so @supabase/ssr can recover the session
        // (sb-{ref}-auth-token). The previous implementation returned [] as
        // a placeholder, which silently broke server-side auth: getSession()
        // always resolved to null and every protected route bounced back to
        // /login without any error surfaced to the user.
        return cookieStore.getAll ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set?.(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; the middleware refreshes the
          // session instead. This catch is intentional.
        }
      },
    },
  });
}

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server
 * contexts (webhooks, background jobs, migrations). Never expose to clients.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.',
    );
  }

  return createSSRClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => undefined },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
