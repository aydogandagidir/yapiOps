'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilePlus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useRouter } from '@/i18n/navigation';

interface ProjectRow {
  id: string;
  name: string;
  pafta_no: string | null;
  ada_no: string | null;
  parsel_no: string | null;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  project: ProjectRow;
  canDelete: boolean;
}

export function ProjectDetail({ project, canDelete }: Props) {
  const t = useTranslations('projects');
  const router = useRouter();
  const queryClient = useQueryClient();

  const archive = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'archive_failed');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[project.il, project.ilce, project.mahalle].filter(Boolean).join(' / ') || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/ek3pilot/new">
              <FilePlus className="mr-2 h-4 w-4" /> {t('newEk3')}
            </Link>
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm(t('archiveConfirm'))) {
                  archive.mutate();
                }
              }}
              disabled={archive.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t('archive')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('detailsTitle')}</CardTitle>
          <CardDescription>{t('detailsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            <Pair label={t('fields.pafta')} value={project.pafta_no} />
            <Pair label={t('fields.ada')} value={project.ada_no} />
            <Pair label={t('fields.parsel')} value={project.parsel_no} />
            <Pair
              label={t('fields.created')}
              value={new Date(project.created_at).toLocaleDateString('tr-TR')}
            />
            <Pair
              label={t('fields.updated')}
              value={new Date(project.updated_at).toLocaleDateString('tr-TR')}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}
