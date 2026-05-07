'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@yapiops/ui';
import { FileText, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface Ek3ListItem {
  id: string;
  project_id: string;
  version: number;
  status: 'draft' | 'completed' | 'signed' | 'superseded';
  updated_at: string;
}

async function fetchEk3List(): Promise<Ek3ListItem[]> {
  const res = await fetch('/api/ek3', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load');
  const json: { ek3Forms?: Ek3ListItem[] } = await res.json();
  return json.ek3Forms ?? [];
}

const STATUS_BADGE: Record<Ek3ListItem['status'], string> = {
  draft: 'bg-secondary text-secondary-foreground',
  completed: 'bg-blue-100 text-blue-900',
  signed: 'bg-green-100 text-green-900',
  superseded: 'bg-muted text-muted-foreground line-through',
};

export function Ek3List() {
  const t = useTranslations('ek3pilot');
  const { data, isLoading, error } = useQuery({
    queryKey: ['ek3', 'list'],
    queryFn: fetchEk3List,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/ek3pilot/new">
            <Plus className="mr-2 h-4 w-4" /> {t('list.newButton')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <FileText className="mr-2 inline h-4 w-4" />
            Ek-3
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : error ? (
            <p className="text-sm text-destructive">Hata: {(error).message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('list.empty')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left">{t('list.columns.project')}</th>
                  <th className="py-2 text-left">{t('list.columns.version')}</th>
                  <th className="py-2 text-left">{t('list.columns.status')}</th>
                  <th className="py-2 text-left">{t('list.columns.updated')}</th>
                  <th className="py-2 text-right">{t('list.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{row.project_id.slice(0, 8)}…</td>
                    <td className="py-2">v{row.version}</td>
                    <td className="py-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_BADGE[row.status],
                        )}
                      >
                        {t(`list.status.${row.status}`)}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(row.updated_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-2 text-right">
                      <Button asChild variant="link" size="sm">
                        <Link href={`/ek3pilot/${row.id}`}>Aç</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
