'use client';

import type { FirmaBilgileri } from '@yapiops/ek3';

import { FirmaSablonSelect } from '../firma-sablon-select';

import { FirmaFields } from './firma-fields';

interface Props {
  value?: Partial<FirmaBilgileri>;
  onChange: (next: Partial<FirmaBilgileri>) => void;
  readOnly?: boolean;
}

export function MuteahhitStep({ value, onChange, readOnly }: Props) {
  return (
    <div className="space-y-4">
      <FirmaSablonSelect
        type="muteahhit"
        onPick={(picked) => {
          onChange(picked);
        }}
        disabled={readOnly}
      />
      <FirmaFields<FirmaBilgileri>
        variant="muteahhit"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  );
}
