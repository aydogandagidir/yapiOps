'use client';

import { type KisiBilgileri, isValidTckn, isValidVkn } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value?: Partial<KisiBilgileri>;
  onChange: (next: Partial<KisiBilgileri>) => void;
  readOnly?: boolean;
}

export function SahibiStep({ value, onChange, readOnly }: Props) {
  const t = useTranslations('ek3pilot.wizard.fields.sahibi');
  const tv = useTranslations('ek3pilot.validators');
  const v: Partial<KisiBilgileri> = value ?? {};

  const update = (key: keyof KisiBilgileri, raw: string) => {
    onChange({ ...v, [key]: raw });
  };

  const tcknError = useMemo(() => {
    if (v.tckn == null || v.tckn === '') return null;
    return isValidTckn(v.tckn) ? null : tv('tckn');
  }, [v.tckn, tv]);

  const vknError = useMemo(() => {
    if (v.vkn == null || v.vkn === '') return null;
    return isValidVkn(v.vkn) ? null : tv('vkn');
  }, [v.vkn, tv]);

  const idError = (v.tckn == null || v.tckn === '') && (v.vkn == null || v.vkn === '')
    ? tv('tcknOrVkn')
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t('adSoyad')} required>
        <Input
          value={v.adSoyad ?? ''}
          onChange={(e) => { update('adSoyad', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('adres')} required>
        <Input
          value={v.adres ?? ''}
          onChange={(e) => { update('adres', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('tckn')} error={tcknError ?? idError}>
        <Input
          value={v.tckn ?? ''}
          onChange={(e) => { update('tckn', e.target.value); }}
          disabled={readOnly}
          maxLength={11}
        />
      </Field>
      <Field label={t('vkn')} error={vknError}>
        <Input
          value={v.vkn ?? ''}
          onChange={(e) => { update('vkn', e.target.value); }}
          disabled={readOnly}
          maxLength={10}
        />
      </Field>
      <Field label={t('telefon')}>
        <Input
          value={v.telefon ?? ''}
          onChange={(e) => { update('telefon', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('eposta')}>
        <Input
          type="email"
          value={v.eposta ?? ''}
          onChange={(e) => { update('eposta', e.target.value); }}
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
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
