'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Ek3TemplateRow } from '@yapiops/ek3/template-source';
import { cn } from '@yapiops/ui';
import { CheckCircle2, CloudDownload, FileUp, Loader2, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  initialTemplates: Ek3TemplateRow[];
}

interface ListResponse {
  templates: Ek3TemplateRow[];
}

interface SyncResponse {
  status: 'unchanged' | 'new' | 'first' | 'fetch_failed';
  id?: string;
  sha256?: string;
  sourceUrl?: string;
  error?: string;
  activeId?: string | null;
  version?: string;
}

async function fetchTemplates(): Promise<Ek3TemplateRow[]> {
  const res = await fetch('/api/admin/ek3-templates', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load');
  const json = (await res.json()) as ListResponse;
  return json.templates;
}

async function triggerSync(): Promise<SyncResponse> {
  const res = await fetch('/api/admin/ek3-templates/sync', { method: 'POST' });
  return (await res.json()) as SyncResponse;
}

async function activateRow(id: string): Promise<void> {
  const res = await fetch(`/api/admin/ek3-templates/${id}/activate`, { method: 'POST' });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'activate_failed');
  }
}

export function Ek3TemplateManager({ initialTemplates }: Props) {
  const t = useTranslations('ek3pilot.templates');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['ek3-templates'],
    queryFn: fetchTemplates,
    initialData: initialTemplates,
  });

  const sync = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ek3-templates'] });
    },
  });

  const activate = useMutation({
    mutationFn: activateRow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ek3-templates'] });
    },
  });

  const upload = useMutation({
    mutationFn: async (form: FormData) => {
      const res = await fetch('/api/admin/ek3-templates', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'upload_failed');
      }
      return (await res.json()) as { id: string; deduped: boolean; activated: boolean };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ek3-templates'] });
    },
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');

  const active = data.find((row) => row.is_active) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('activeTitle')}</CardTitle>
          <CardDescription>{t('activeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {active ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">{t('fields.version')}</dt>
              <dd className="font-medium">{active.version}</dd>
              <dt className="text-muted-foreground">{t('fields.source')}</dt>
              <dd>
                {active.source === 'official_fetch' ? t('source.official') : t('source.manual')}
              </dd>
              <dt className="text-muted-foreground">{t('fields.sha256')}</dt>
              <dd className="font-mono text-xs">{active.sha256.slice(0, 16)}…</dd>
              <dt className="text-muted-foreground">{t('fields.fetchedAt')}</dt>
              <dd>
                {active.fetched_at ? new Date(active.fetched_at).toLocaleString('tr-TR') : '—'}
              </dd>
              {active.source_url && (
                <>
                  <dt className="text-muted-foreground">{t('fields.sourceUrl')}</dt>
                  <dd className="truncate text-xs">
                    <a
                      href={active.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {active.source_url}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noActive')}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={() => {
                sync.mutate();
              }}
              disabled={sync.isPending}
            >
              {sync.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="mr-2 h-4 w-4" />
              )}
              {t('actions.syncNow')}
            </Button>
          </div>
          {sync.data && (
            <p
              className={cn(
                'text-sm',
                sync.data.status === 'fetch_failed' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {sync.data.status === 'unchanged' && t('syncResult.unchanged')}
              {sync.data.status === 'new' && t('syncResult.new')}
              {sync.data.status === 'first' && t('syncResult.first')}
              {sync.data.status === 'fetch_failed' &&
                t('syncResult.failed', { error: sync.data.error ?? '?' })}
            </p>
          )}
          {sync.isError && <p className="text-sm text-destructive">{sync.error.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('uploadTitle')}</CardTitle>
          <CardDescription>{t('uploadDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('fields.version')}</Label>
              <Input
                placeholder="2026-04-01-revize"
                value={version}
                onChange={(e) => {
                  setVersion(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('fields.notes')}</Label>
              <Input
                placeholder={t('notesPlaceholder')}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              />
            </div>
          </div>
          <Input ref={fileRef} type="file" accept="application/pdf" />
          <Button
            disabled={upload.isPending || !version}
            onClick={() => {
              const file = fileRef.current?.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              fd.append('version', version);
              if (notes) fd.append('notes', notes);
              upload.mutate(fd);
            }}
          >
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            {t('actions.upload')}
          </Button>
          {upload.isSuccess && upload.data.deduped && (
            <p className="text-sm text-amber-700">{t('uploadResult.deduped')}</p>
          )}
          {upload.isError && <p className="text-sm text-destructive">{upload.error.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('historyTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left">{t('fields.version')}</th>
                  <th className="py-2 text-left">{t('fields.source')}</th>
                  <th className="py-2 text-left">{t('fields.sha256')}</th>
                  <th className="py-2 text-left">{t('fields.fetchedAt')}</th>
                  <th className="py-2 text-right">{t('fields.action')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.version}</td>
                    <td className="py-2">
                      {row.source === 'official_fetch' ? t('source.official') : t('source.manual')}
                    </td>
                    <td className="py-2 font-mono text-xs">{row.sha256.slice(0, 12)}…</td>
                    <td className="py-2 text-muted-foreground">
                      {row.fetched_at ? new Date(row.fetched_at).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="py-2 text-right">
                      {row.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> {t('activeBadge')}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            activate.mutate(row.id);
                          }}
                          disabled={activate.isPending}
                        >
                          <RotateCw className="mr-1 h-3 w-3" /> {t('actions.activate')}
                        </Button>
                      )}
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
