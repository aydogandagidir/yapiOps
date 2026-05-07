'use client';

import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Link, useRouter } from '@/i18n/navigation';

interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  projects: ProjectOption[];
}

interface CreatedRow {
  id: string;
}

async function createEk3(projectId: string): Promise<CreatedRow> {
  const res = await fetch('/api/ek3', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  const json: { ek3Form?: CreatedRow; error?: string } = await res.json();
  if (!res.ok || !json.ek3Form) throw new Error(json.error ?? 'create_failed');
  return json.ek3Form;
}

export function Ek3NewClient({ projects }: Props) {
  const t = useTranslations('ek3pilot');
  const router = useRouter();
  const [projectId, setProjectId] = useState('');

  const create = useMutation({
    mutationFn: createEk3,
    onSuccess: (row) => {
      router.push(`/ek3pilot/${row.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('list.newButton')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proje seç</CardTitle>
          <CardDescription>
            Ek-3 bir projeye bağlanır. İlgili projeyi seçin veya yeni bir proje oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Henüz projeniz yok.
              <Button asChild variant="link" size="sm" className="ml-1 h-auto p-0">
                <Link href="/projects/new">
                  <Plus className="mr-1 h-3 w-3" /> Yeni proje oluşturun
                </Link>
              </Button>
              .
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Proje</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                  }}
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={!projectId || create.isPending}
                  onClick={() => {
                    create.mutate(projectId);
                  }}
                >
                  Oluştur
                </Button>
                <Button asChild variant="outline">
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" /> Yeni proje
                  </Link>
                </Button>
              </div>
            </>
          )}
          {create.isError && (
            <p className="text-sm text-destructive">{(create.error).message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
