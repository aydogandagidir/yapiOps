'use client';

import type { FirmaBilgileri, YapiDenetimBilgileri } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FirmaFieldsProps<T extends FirmaBilgileri | YapiDenetimBilgileri> {
  value?: Partial<T>;
  onChange: (next: Partial<T>) => void;
  readOnly?: boolean;
  variant: 'muteahhit' | 'denetim';
}

export function FirmaFields<T extends FirmaBilgileri | YapiDenetimBilgileri>({
  value,
  onChange,
  readOnly,
  variant,
}: FirmaFieldsProps<T>) {
  const t = useTranslations('ek3pilot.wizard.fields.firma');
  const v: Partial<T> = value ?? {};

  const update = (key: keyof T, raw: unknown) => {
    onChange({ ...v, [key]: raw });
  };

  const updateNested = (parent: 'yetkili' | 'sorumluMuhendis', key: string, raw: string) => {
    const vRecord = v as unknown as Record<string, Record<string, string> | undefined>;
    const existing = vRecord[parent];
    onChange({
      ...v,
      [parent]: { ...(existing ?? {}), [key]: raw },
    });
  };

  const isDenetim = variant === 'denetim';
  const denetimV = isDenetim ? (v as Partial<YapiDenetimBilgileri>) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t('unvan')} required>
        <Input
          value={v.unvan ?? ''}
          onChange={(e) => {
            update('unvan', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('vkn')} required>
        <Input
          value={v.vkn ?? ''}
          maxLength={10}
          onChange={(e) => {
            update('vkn', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      {!isDenetim && (
        <>
          <Field label={t('yetkiSinifi')}>
            <Input
              value={v.yetkiBelgesiSinifi ?? ''}
              onChange={(e) => {
                update('yetkiBelgesiSinifi', e.target.value);
              }}
              disabled={readOnly}
            />
          </Field>
          <Field label={t('yetkiNo')}>
            <Input
              value={v.yetkiBelgesiNo ?? ''}
              onChange={(e) => {
                update('yetkiBelgesiNo', e.target.value);
              }}
              disabled={readOnly}
            />
          </Field>
        </>
      )}
      {isDenetim && denetimV && (
        <Field label={t('izinBelgesiNo')} required>
          <Input
            value={denetimV.izinBelgesiNo ?? ''}
            onChange={(e) => {
              update(
                'izinBelgesiNo' as keyof T,
                e.target.value,
              ); /* izinBelgesiNo only on denetim */
            }}
            disabled={readOnly}
          />
        </Field>
      )}
      <Field label={t('yetkiliAdi')} required>
        <Input
          value={v.yetkili?.adSoyad ?? ''}
          onChange={(e) => {
            updateNested('yetkili', 'adSoyad', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('yetkiliTckn')}>
        <Input
          value={v.yetkili?.tckn ?? ''}
          maxLength={11}
          onChange={(e) => {
            updateNested('yetkili', 'tckn', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      {isDenetim && denetimV && (
        <>
          <Field label={t('sorumluMuhendis')} required>
            <Input
              value={denetimV.sorumluMuhendis?.adSoyad ?? ''}
              onChange={(e) => {
                updateNested('sorumluMuhendis', 'adSoyad', e.target.value);
              }}
              disabled={readOnly}
            />
          </Field>
          <Field label={t('odaSicilNo')} required>
            <Input
              value={denetimV.sorumluMuhendis?.odaSicilNo ?? ''}
              onChange={(e) => {
                updateNested('sorumluMuhendis', 'odaSicilNo', e.target.value);
              }}
              disabled={readOnly}
            />
          </Field>
        </>
      )}
      <Field label={t('adres')} required>
        <Input
          value={v.adres ?? ''}
          onChange={(e) => {
            update('adres', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('telefon')}>
        <Input
          value={v.telefon ?? ''}
          onChange={(e) => {
            update('telefon', e.target.value);
          }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('eposta')}>
        <Input
          type="email"
          value={v.eposta ?? ''}
          onChange={(e) => {
            update('eposta', e.target.value);
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
