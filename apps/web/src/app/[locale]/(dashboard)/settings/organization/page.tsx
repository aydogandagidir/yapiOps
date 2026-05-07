import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  tax_number: string | null;
  e_invoice_alias: string | null;
  subscription_tier: string;
  seat_count: number;
}

export default async function OrganizationSettingsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const ctx = await requireAuthContext(cookieStore);

  const supabase = createSupabaseServerClient(cookieStore);
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, tax_number, e_invoice_alias, subscription_tier, seat_count')
    .eq('id', ctx.membership.orgId)
    .single<Org>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizasyon</h1>
        <p className="text-sm text-muted-foreground">
          Şirket bilgileri, fatura alias&apos;ı ve plan detayı.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{org?.name ?? '—'}</CardTitle>
          <CardDescription>Plan: {org?.subscription_tier ?? 'free'}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Slug</div>
            <div className="font-mono">{org?.slug ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">VKN</div>
            <div className="font-mono">{org?.tax_number ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">E-fatura alias</div>
            <div className="font-mono">{org?.e_invoice_alias ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Seat sayısı</div>
            <div className="font-mono">{org?.seat_count ?? 0}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
