'use client';

import type { YapiDenetimBilgileri } from '@yapiops/ek3';

import { FirmaSablonSelect } from '../firma-sablon-select';

import { FirmaFields } from './firma-fields';

interface Props {
  value?: Partial<YapiDenetimBilgileri>;
  onChange: (next: Partial<YapiDenetimBilgileri>) => void;
  readOnly?: boolean;
}

export function DenetimStep({ value, onChange, readOnly }: Props) {
  return (
    <div className="space-y-4">
      <FirmaSablonSelect
        type="denetim"
        onPick={(picked) => {
          onChange(picked);
        }}
        disabled={readOnly}
      />
      <FirmaFields<YapiDenetimBilgileri>
        variant="denetim"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  );
}
