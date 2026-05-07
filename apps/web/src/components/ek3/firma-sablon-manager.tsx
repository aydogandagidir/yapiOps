'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FirmaBilgileri, YapiDenetimBilgileri } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { FirmaFields } from './steps/firma-fields';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface SablonRow {
  id: string;
  type: 'muteahhit' | 'denetim';
  name: string;
  data: FirmaBilgileri | YapiDenetimBilgileri;
}

async function fetchSablonlar(): Promise<SablonRow[]> {
  const res = await fetch('/api/firma-sablonlari', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load');
  const json: { sablonlar?: SablonRow[] } = await res.json();
  return json.sablonlar ?? [];
}

async function createSablon(payload: {
  type: 'muteahhit' | 'denetim';
  name: string;
  data: Partial<FirmaBilgileri> | Partial<YapiDenetimBilgileri>;
}): Promise<void> {
  const res = await fetch('/api/firma-sablonlari', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'create_failed');
  }
}

export function FirmaSablonManager() {
  const t = useTranslations('ek3pilot.firmaSablon');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['firma-sablonlari', 'all'],
    queryFn: fetchSablonlar,
  });

  const [name, setName] = useState('');
  const [type, setType] = useState<'muteahhit' | 'denetim'>('muteahhit');
  const [draftMuteahhit, setDraftMuteahhit] = useState<Partial<FirmaBilgileri>>({});
  const [draftDenetim, setDraftDenetim] = useState<Partial<YapiDenetimBilgileri>>({});

  const create = useMutation({
    mutationFn: createSablon,
    onSuccess: () => {
      setName('');
      setDraftMuteahhit({});
      setDraftDenetim({});
      void queryClient.invalidateQueries({ queryKey: ['firma-sablonlari'] });
    },
  });

  const muteahhitler = (data ?? []).filter((s) => s.type === 'muteahhit');
  const denetimler = (data ?? []).filter((s) => s.type === 'denetim');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('addButton')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tür</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'muteahhit' | 'denetim');
                }}
              >
                <option value="muteahhit">Müteahhit</option>
                <option value="denetim">Yapı Denetim</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Şablon adı</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); }} />
            </div>
          </div>
          {type === 'muteahhit' ? (
            <FirmaFields<FirmaBilgileri>
              variant="muteahhit"
              value={draftMuteahhit}
              onChange={setDraftMuteahhit}
            />
          ) : (
            <FirmaFields<YapiDenetimBilgileri>
              variant="denetim"
              value={draftDenetim}
              onChange={setDraftDenetim}
            />
          )}
          <Button
            disabled={!name || create.isPending}
            onClick={() => {
              const payload =
                type === 'muteahhit' && draftMuteahhit
                  ? { type, name, data: draftMuteahhit }
                  : type === 'denetim' && draftDenetim
                    ? { type, name, data: draftDenetim }
                    : null;
              if (payload) create.mutate(payload);
            }}
          >
            Kaydet
          </Button>
          {create.isError && (
            <p className="text-sm text-destructive">{(create.error).message}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('muteahhitTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {muteahhitler.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {muteahhitler.map((s) => (
                  <li key={s.id} className="rounded-md border p-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.data.unvan}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('denetimTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {denetimler.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {denetimler.map((s) => (
                  <li key={s.id} className="rounded-md border p-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.data.unvan}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
