'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';

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
            Ek-3 bir projeye bağlanır. İlgili projeyi seçin veya önce
            <a href="/dashboard" className="ml-1 underline">
              dashboard&apos;dan
            </a>
            yeni bir proje oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Button
            disabled={!projectId || create.isPending}
            onClick={() => {
              create.mutate(projectId);
            }}
          >
            Oluştur
          </Button>
          {create.isError && (
            <p className="text-sm text-destructive">{(create.error).message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
