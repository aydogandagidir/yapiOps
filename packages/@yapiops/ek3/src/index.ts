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

export {
  activateTemplate,
  compareToActive,
  downloadActiveTemplateBytes,
  fetchOfficialTemplate,
  getActiveTemplate,
  getOfficialSources,
  recordNewTemplate,
  sha256OfBytes,
} from './template-source';
export type {
  CompareResult,
  Ek3TemplateRow,
  FetchedTemplate,
  RecordedTemplate,
  RecordNewTemplateInput,
} from './template-source';
