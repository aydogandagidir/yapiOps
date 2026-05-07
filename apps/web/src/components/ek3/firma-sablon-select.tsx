'use client';

import { useQuery } from '@tanstack/react-query';
import type { FirmaBilgileri, YapiDenetimBilgileri } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';

interface SablonRow {
  id: string;
  type: 'muteahhit' | 'denetim';
  name: string;
  data: Partial<FirmaBilgileri> | Partial<YapiDenetimBilgileri>;
}

interface Props {
  type: 'muteahhit' | 'denetim';
  onPick: (data: Partial<FirmaBilgileri> | Partial<YapiDenetimBilgileri>) => void;
  disabled?: boolean;
}

async function fetchSablonlar(type: 'muteahhit' | 'denetim'): Promise<SablonRow[]> {
  const res = await fetch(`/api/firma-sablonlari?type=${type}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load');
  const json: { sablonlar?: SablonRow[] } = await res.json();
  return json.sablonlar ?? [];
}

export function FirmaSablonSelect({ type, onPick, disabled }: Props) {
  const t = useTranslations('ek3pilot.firmaSablon');
  const { data } = useQuery({
    queryKey: ['firma-sablonlari', type],
    queryFn: () => fetchSablonlar(type),
  });

  return (
    <div className="space-y-2">
      <Label>{t('selectPlaceholder')}</Label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          const found = data?.find((s) => s.id === id);
          if (found) onPick(found.data);
        }}
      >
        <option value="">{t('selectNone')}</option>
        {(data ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
