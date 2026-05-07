import { type SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '@yapiops/audit';
import { getOrgMembership, getServerSession } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { BridgeStartParamsSchema } from '@/app/api/auth/desktop-bridge/_schema';
import { BridgeConnect } from '@/components/auth/bridge-connect';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function DesktopBridgeAuthPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') flat[key] = value;
  }

  const parsed = BridgeStartParamsSchema.safeParse(flat);
  if (!parsed.success) {
    return (
      <div className="mx-auto max-w-md p-8 text-sm text-destructive">
        Geçersiz Bridge başlatma parametreleri.
      </div>
    );
  }

  const cookieStore = await cookies();
  const session = await getServerSession(cookieStore);

  // Login değilse — `return` parametresiyle login'e yönlendir, sonrası burada
  // devam eder.
  if (!session) {
    const returnTo = `/${locale}/auth/desktop-bridge?${new URLSearchParams(flat).toString()}`;
    redirect(`/${locale}/login?return=${encodeURIComponent(returnTo)}`);
  }

  const membership = await getOrgMembership(cookieStore, session.user.id);

  // Audit: bridge başlatıldı — ilk session yakalama metriği için.
  if (membership) {
    const supabase = createSupabaseServerClient(cookieStore) as unknown as SupabaseClient;
    const audit = new AuditLogger(supabase, {
      orgId: membership.orgId,
      userId: session.user.id,
      ipAddress: (await headers()).get('x-forwarded-for'),
      userAgent: (await headers()).get('user-agent'),
    });
    await audit.log('bridge.session.started', {
      resourceType: 'bridge_session',
      metadata: { redirect_uri: parsed.data.redirect_uri },
    });
  }

  return (
    <BridgeConnect
      redirectUri={parsed.data.redirect_uri}
      state={parsed.data.state}
      userEmail={session.user.email ?? ''}
      orgName={membership?.fullName ?? null}
    />
  );
}
