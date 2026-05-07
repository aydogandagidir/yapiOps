'use client';

import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface ProjectListItem {
  id: string;
  name: string;
  ada_no: string | null;
  parsel_no: string | null;
  il: string | null;
  ilce: string | null;
  updated_at: string;
}

async function fetchProjects(): Promise<ProjectListItem[]> {
  const res = await fetch('/api/projects', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load');
  const json: { projects?: ProjectListItem[] } = await res.json();
  return json.projects ?? [];
}

export function ProjectList() {
  const t = useTranslations('projects');
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: fetchProjects,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" /> {t('newButton')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <FolderOpen className="mr-2 inline h-4 w-4" />
            {t('listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : error ? (
            <p className="text-sm text-destructive">Hata: {(error).message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left">{t('columns.name')}</th>
                  <th className="py-2 text-left">{t('columns.location')}</th>
                  <th className="py-2 text-left">{t('columns.adaParsel')}</th>
                  <th className="py-2 text-left">{t('columns.updated')}</th>
                  <th className="py-2 text-right">{t('columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2 text-muted-foreground">
                      {[row.il, row.ilce].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {row.ada_no && row.parsel_no
                        ? `${row.ada_no}/${row.parsel_no}`
                        : '—'}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(row.updated_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-2 text-right">
                      <Button asChild variant="link" size="sm">
                        <Link href={`/projects/${row.id}`}>{t('open')}</Link>
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
