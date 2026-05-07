'use client';

import type { InsaatBilgileri } from '@yapiops/ek3';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value?: Partial<InsaatBilgileri>;
  onChange: (next: Partial<InsaatBilgileri>) => void;
  readOnly?: boolean;
}

export function InsaatStep({ value, onChange, readOnly }: Props) {
  const t = useTranslations('ek3pilot.wizard.fields.insaat');
  const v: Partial<InsaatBilgileri> = value ?? {};

  const update = (key: keyof InsaatBilgileri, raw: string | number) => {
    onChange({ ...v, [key]: raw });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t('yapiRuhsatNo')}>
        <Input
          value={v.yapiRuhsatNo ?? ''}
          onChange={(e) => { update('yapiRuhsatNo', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('yapiRuhsatTarihi')}>
        <Input
          type="date"
          value={v.yapiRuhsatTarihi ?? ''}
          onChange={(e) => { update('yapiRuhsatTarihi', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('baslamaTarihi')} required>
        <Input
          type="date"
          value={v.baslamaTarihi ?? ''}
          onChange={(e) => { update('baslamaTarihi', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('bitisTarihi')} required>
        <Input
          type="date"
          value={v.bitisTarihi ?? ''}
          onChange={(e) => { update('bitisTarihi', e.target.value); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('toplamSureGun')} required>
        <Input
          type="number"
          value={v.toplamSureGun ?? ''}
          onChange={(e) => { update('toplamSureGun', Number(e.target.value)); }}
          disabled={readOnly}
        />
      </Field>
      <Field label={t('maliyetTry')} required>
        <Input
          type="number"
          value={v.maliyetTry ?? ''}
          onChange={(e) => { update('maliyetTry', Number(e.target.value)); }}
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
