'use client';

import type { ProjeBilgileri } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value?: Partial<ProjeBilgileri>;
  onChange: (next: Partial<ProjeBilgileri>) => void;
  readOnly?: boolean;
}

export function ProjeStep({ value, onChange, readOnly }: Props) {
  const t = useTranslations('ek3pilot.wizard.fields.proje');
  const v: Partial<ProjeBilgileri> = value ?? {};

  const update = (key: keyof ProjeBilgileri, raw: string | number | undefined) => {
    onChange({ ...v, [key]: raw });
  };

  const updateKoordinat = (key: 'lat' | 'lng', raw: string) => {
    const parsed = raw === '' ? undefined : Number(raw);
    onChange({
      ...v,
      koordinat: {
        lat: key === 'lat' ? (parsed ?? 0) : (v.koordinat?.lat ?? 0),
        lng: key === 'lng' ? (parsed ?? 0) : (v.koordinat?.lng ?? 0),
      },
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t('ad')} required>
        <Input
          value={v.ad ?? ''}
          onChange={(e) => {
            update('ad', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('imarDurumu')}>
        <Input
          value={v.imarDurumu ?? ''}
          onChange={(e) => {
            update('imarDurumu', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('il')} required>
        <Input
          value={v.il ?? ''}
          onChange={(e) => {
            update('il', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('ilce')} required>
        <Input
          value={v.ilce ?? ''}
          onChange={(e) => {
            update('ilce', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('mahalle')}>
        <Input
          value={v.mahalle ?? ''}
          onChange={(e) => {
            update('mahalle', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('pafta')}>
        <Input
          value={v.pafta ?? ''}
          onChange={(e) => {
            update('pafta', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('ada')} required>
        <Input
          value={v.ada ?? ''}
          onChange={(e) => {
            update('ada', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('parsel')} required>
        <Input
          value={v.parsel ?? ''}
          onChange={(e) => {
            update('parsel', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('lat')}>
        <Input
          type="number"
          step="0.00001"
          value={v.koordinat?.lat ?? ''}
          onChange={(e) => {
            updateKoordinat('lat', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('lng')}>
        <Input
          type="number"
          step="0.00001"
          value={v.koordinat?.lng ?? ''}
          onChange={(e) => {
            updateKoordinat('lng', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
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
