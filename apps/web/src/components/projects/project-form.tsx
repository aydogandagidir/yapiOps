'use client';

import { useMutation } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';

interface ProjectFormState {
  name: string;
  il: string;
  ilce: string;
  ada_no: string;
  parsel_no: string;
  pafta_no: string;
  mahalle: string;
}

const INITIAL: ProjectFormState = {
  name: '',
  il: '',
  ilce: '',
  ada_no: '',
  parsel_no: '',
  pafta_no: '',
  mahalle: '',
};

interface CreatedProject {
  id: string;
}

async function createProject(payload: ProjectFormState): Promise<CreatedProject> {
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => typeof v !== 'string' || v.length > 0),
  );
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cleaned),
  });
  const json: { project?: CreatedProject; error?: string } = await res.json();
  if (!res.ok || !json.project) throw new Error(json.error ?? 'create_failed');
  return json.project;
}

export function ProjectForm() {
  const t = useTranslations('projects');
  const router = useRouter();
  const [form, setForm] = useState<ProjectFormState>(INITIAL);

  const create = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      router.push(`/projects/${project.id}`);
    },
  });

  const update = (key: keyof ProjectFormState, raw: string) => {
    setForm((prev) => ({ ...prev, [key]: raw }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('newTitle')}</h1>
        <p className="text-muted-foreground">{t('newSubtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('formTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('fields.name')} required>
              <Input
                value={form.name}
                onChange={(e) => {
                  update('name', e.target.value);
                }}
              />
            </Field>
            <Field label={t('fields.il')}>
              <Input
                value={form.il}
                onChange={(e) => {
                  update('il', e.target.value);
                }}
              />
            </Field>
            <Field label={t('fields.ilce')}>
              <Input
                value={form.ilce}
                onChange={(e) => {
                  update('ilce', e.target.value);
                }}
              />
            </Field>
            <Field label={t('fields.mahalle')}>
              <Input
                value={form.mahalle}
                onChange={(e) => {
                  update('mahalle', e.target.value);
                }}
              />
            </Field>
            <Field label={t('fields.pafta')}>
              <Input
                value={form.pafta_no}
                onChange={(e) => {
                  update('pafta_no', e.target.value);
                }}
              />
            </Field>
            <Field label={t('fields.ada')}>
              <Input
                value={form.ada_no}
                onChange={(e) => {
                  update('ada_no', e.target.value);
                }}
              />
            </Field>
            <Field label={t('fields.parsel')}>
              <Input
                value={form.parsel_no}
                onChange={(e) => {
                  update('parsel_no', e.target.value);
                }}
              />
            </Field>
          </div>

          <Button
            disabled={form.name.length < 3 || create.isPending}
            onClick={() => {
              create.mutate(form);
            }}
          >
            {create.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('createButton')}
          </Button>
          {create.isError && <p className="text-sm text-destructive">{create.error.message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
