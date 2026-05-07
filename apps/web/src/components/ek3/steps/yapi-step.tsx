'use client';

import { type YapiBilgileri, yapiCrossChecks } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value?: Partial<YapiBilgileri>;
  onChange: (next: Partial<YapiBilgileri>) => void;
  readOnly?: boolean;
}

const SINIF_OPTIONS = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A'] as const;
const KULLANIM_OPTIONS = [
  'konut',
  'ticaret',
  'sanayi',
  'saglik',
  'egitim',
  'turizm',
  'ofis',
  'karma',
  'diger',
] as const;
const TASIYICI_OPTIONS = ['BAC', 'BAP', 'BAC-BAP', 'YIGMA', 'CELIK', 'KARMA'] as const;

export function YapiStep({ value, onChange, readOnly }: Props) {
  const t = useTranslations('ek3pilot.wizard.fields.yapi');
  const v: Partial<YapiBilgileri> = value ?? {};

  const update = (key: keyof YapiBilgileri, raw: unknown) => {
    onChange({ ...v, [key]: raw });
  };

  const num = (raw: string): number | undefined => (raw === '' ? undefined : Number(raw));

  const warnings = useMemo(() => {
    if (v.dts == null || v.bys == null || v.toplamYukseklikM == null) return [];
    return yapiCrossChecks({
      sds: v.sds,
      dts: v.dts,
      yukseklikM: v.toplamYukseklikM,
      bys: v.bys,
    });
  }, [v.dts, v.bys, v.toplamYukseklikM, v.sds]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Select
          label={t('sinif')}
          value={v.sinif ?? ''}
          options={[...SINIF_OPTIONS]}
          onChange={(opt) => {
            update('sinif', opt);
          }}
          disabled={readOnly}
        />
        <Select
          label={t('kullanimAmaci')}
          value={v.kullanimAmaci ?? ''}
          options={[...KULLANIM_OPTIONS]}
          onChange={(opt) => {
            update('kullanimAmaci', opt);
          }}
          disabled={readOnly}
        />
        <Select
          label={t('tasiyiciSistem')}
          value={v.tasiyiciSistem ?? ''}
          options={[...TASIYICI_OPTIONS]}
          onChange={(opt) => {
            update('tasiyiciSistem', opt);
          }}
          disabled={readOnly}
        />
        <Field label={t('toplamAlanM2')}>
          <Input
            type="number"
            value={v.toplamAlanM2 ?? ''}
            onChange={(e) => {
              const n = num(e.target.value);
              if (n != null) update('toplamAlanM2', n);
            }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('bodrumKat')}>
          <Input
            type="number"
            value={v.bodrumKat ?? ''}
            onChange={(e) => {
              const n = num(e.target.value);
              if (n != null) update('bodrumKat', n);
            }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('zeminUstuKat')}>
          <Input
            type="number"
            value={v.zeminUstuKat ?? ''}
            onChange={(e) => {
              const n = num(e.target.value);
              if (n != null) update('zeminUstuKat', n);
            }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('toplamYukseklikM')}>
          <Input
            type="number"
            step="0.01"
            value={v.toplamYukseklikM ?? ''}
            onChange={(e) => {
              const n = num(e.target.value);
              if (n != null) update('toplamYukseklikM', n);
            }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('dts')}>
          <Input
            type="number"
            min={1}
            max={4}
            value={v.dts ?? ''}
            onChange={(e) => {
              const n = num(e.target.value);
              if (n != null && n >= 1 && n <= 4) update('dts', n);
            }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('bys')}>
          <Input
            type="number"
            min={1}
            max={8}
            value={v.bys ?? ''}
            onChange={(e) => {
              const n = num(e.target.value);
              if (n != null && n >= 1 && n <= 8) update('bys', n);
            }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('sds')}>
          <Input
            type="number"
            step="0.001"
            value={v.sds ?? ''}
            onChange={(e) => { update('sds', num(e.target.value)); }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('sd1')}>
          <Input
            type="number"
            step="0.001"
            value={v.sd1 ?? ''}
            onChange={(e) => { update('sd1', num(e.target.value)); }}
            disabled={readOnly}
          />
        </Field>
        <Field label={t('pga')}>
          <Input
            type="number"
            step="0.001"
            value={v.pga ?? ''}
            onChange={(e) => { update('pga', num(e.target.value)); }}
            disabled={readOnly}
          />
        </Field>
      </div>

      {warnings.length > 0 && (
        <ul className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        disabled={disabled}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
