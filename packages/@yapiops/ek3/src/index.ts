export { EK3_STEPS } from './types';
export type {
  Ek3Form,
  Ek3FormData,
  Ek3Step,
  FirmaBilgileri,
  FirmaSablon,
  InsaatBilgileri,
  KisiBilgileri,
  KoordinatBilgisi,
  KullanimAmaci,
  ProjeBilgileri,
  TasiyiciSistem,
  YapiBilgileri,
  YapiDenetimBilgileri,
  YapiSinifi,
} from './types';

export {
  Ek3CreateInputSchema,
  Ek3EtabsImportSchema,
  Ek3FormDataPartialSchema,
  Ek3FormDataSchema,
  Ek3PatchInputSchema,
  Ek3ReviseInputSchema,
  FirmaSablonCreateSchema,
  FirmaSchema,
  InsaatSchema,
  KoordinatSchema,
  ProjeSchema,
  SahibiSchema,
  YapiDenetimSchema,
  YapiSchema,
} from './schema';

export {
  bysConsistency,
  dtsConsistency,
  isValidTckn,
  isValidVkn,
  isValidVknMod9,
  yapiCrossChecks,
} from './validators';
export type { ConsistencyResult, YapiCrossCheckInput } from './validators';

export { mapEtabsToYapi } from './etabs-mapping';
export type { EtabsImportPayload, YapiMappedFields } from './etabs-mapping';

export { BYS_MATRIX, expectedBysFor } from './tbdy-tables';
export type { BysCode, BysRow, DtsCode, ExpectedBysResult } from './tbdy-tables';

// NOTE: `template-source` Node-only (`node:crypto`, Supabase service-role).
// Buradan re-export ETMEYİN — client bundle'a sızdırır. Server route'lar için
// `@yapiops/ek3/template-source` deep import kullanın (subpath export
// `package.json`'da tanımlı).
