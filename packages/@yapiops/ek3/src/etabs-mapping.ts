import type { z } from 'zod';

import type { Ek3EtabsImportSchema } from './schema';
import { dtsConsistency } from './validators';

/**
 * Maps ETABS bridge metadata onto the Ek-3 form's `yapi` step. The bridge
 * exports a JSON payload from `EtabsConnector` (.NET 8 WPF). Faz 1 Hafta 8–9
 * fills in the .NET side; this file is the contract on the cloud side.
 *
 * See ek3pilot.md §5 for the ETABS → Ek-3 field map.
 */

export type EtabsImportPayload = z.infer<typeof Ek3EtabsImportSchema>;

export interface YapiMappedFields {
  toplamAlanM2?: number;
  bodrumKat?: number;
  zeminUstuKat?: number;
  toplamYukseklikM?: number;
  tasiyiciSistem?: 'BAC' | 'BAP' | 'BAC-BAP' | 'YIGMA' | 'CELIK' | 'KARMA';
  sds?: number;
  sd1?: number;
  /** Derived from Sds + height per TBDY Tablo 3.2/3.3. */
  dtsHint?: 1 | 2 | 3 | 4;
}

/**
 * Translates ETABS metadata into the `yapi` step's pre-fillable subset.
 * DTS is derived from Sds when available (TBDY Tablo 3.2). The user is
 * still expected to confirm — engineering judgment overrides.
 */
export function mapEtabsToYapi(payload: EtabsImportPayload): YapiMappedFields {
  const m = payload.etabs.metadata ?? {};
  const fields: YapiMappedFields = {
    toplamAlanM2: m.toplamAlanM2,
    bodrumKat: m.bodrumKat,
    zeminUstuKat: m.zeminUstuKat,
    toplamYukseklikM: m.toplamYukseklikM,
    tasiyiciSistem: m.tasiyiciSistem,
    sds: m.sds,
    sd1: m.sd1,
  };

  if (m.sds != null) {
    // Derive expected DTS by walking thresholds (highest-first).
    for (const candidate of [1, 2, 3, 4] as const) {
      const r = dtsConsistency(m.sds, candidate);
      if (r.ok) {
        fields.dtsHint = candidate;
        break;
      }
    }
  }

  return fields;
}
