'use client';

import { createSupabaseBrowserClient } from '@yapiops/db/client';
import { Cable, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  redirectUri: string;
  state: string;
  userEmail: string;
  orgName: string | null;
}

interface SupabaseSessionPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Cloud → Bridge token aktarım adımı:
 *   1. Sayfa server'da auth.getSession()'ı RLS-aware client ile aldı.
 *   2. Burada client-side `supabase.auth.getSession()` ile fresh tokenları
 *      yeniden çekiyoruz (cookie üzerinden).
 *   3. Bridge'in HttpListener'ına URL fragment ile redirect:
 *      `${redirect_uri}#access_token=…&refresh_token=…&expires_in=…&state=…`
 *   4. Bridge tarafı state parametresini kendi ürettiği değerle eşleştirir
 *      (CSRF koruması).
 *
 * Token'lar URL fragment'a (`#`) konur, query string'e değil — fragment HTTP
 * sunucusuna gitmez, sadece browser'da kalır. Bridge HttpListener bu
 * fragment'ı parse eder.
 */
export function BridgeConnect({ redirectUri, state, userEmail, orgName }: Props) {
  const t = useTranslations('auth.bridge');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !data.session) {
        throw new Error(sessionErr?.message ?? t('errors.noSession'));
      }
      const payload: SupabaseSessionPayload = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in ?? 3600,
      };

      const fragment = new URLSearchParams({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_in: String(payload.expires_in),
        state,
      });

      window.location.replace(`${redirectUri}#${fragment.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'connect_failed');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t('account')}</dt>
              <dd className="font-medium">{userEmail}</dd>
            </div>
            {orgName && (
              <div>
                <dt className="text-xs text-muted-foreground">{t('user')}</dt>
                <dd>{orgName}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">{t('redirectingTo')}</dt>
              <dd className="break-all font-mono text-xs">{redirectUri}</dd>
            </div>
          </dl>

          <p className="text-sm text-muted-foreground">{t('explainer')}</p>

          <Button
            disabled={busy}
            onClick={() => {
              void handleConnect();
            }}
            className="w-full"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {t('connectButton')}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-xs text-muted-foreground">{t('securityNote')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
