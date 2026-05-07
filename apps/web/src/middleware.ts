import { updateSession } from '@yapiops/auth/middleware';
import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Run i18n routing first — it may rewrite the URL to add a locale prefix.
  const intlResponse = intlMiddleware(request);

  // 2. Refresh the Supabase session. updateSession sets cookies on its own
  //    response; copy them onto the intl response so both are preserved.
  const authResponse = await updateSession(request);
  for (const cookie of authResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value);
  }

  return intlResponse;
}

export const config = {
  // Match everything EXCEPT: API routes, Next.js internals, static files, and
  // anything with a file extension (images, fonts, etc.).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
