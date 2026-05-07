import type { Ek3Status } from '@yapiops/db';

/**
 * Ek-3 form domain types — mirrors `docs-internal/modules/ek3pilot.md` §3 and §4.
 * Field names follow the official Yapı Denetim form (RG-30/05/2019-30789).
 */

export interface KoordinatBilgisi {
  lat: number;
  lng: number;
}

export interface ProjeBilgileri {
  ad: string;
  il: string;
  ilce: string;
  mahalle?: string;
  pafta?: string;
  ada: string;
  parsel: string;
  koordinat?: KoordinatBilgisi;
  imarDurumu?: string;
}

export type YapiSinifi = '1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '4A' | '4B' | '5A';
export type TasiyiciSistem = 'BAC' | 'BAP' | 'BAC-BAP' | 'YIGMA' | 'CELIK' | 'KARMA';
export type KullanimAmaci =
  | 'konut'
  | 'ticaret'
  | 'sanayi'
  | 'saglik'
  | 'egitim'
  | 'turizm'
  | 'ofis'
  | 'karma'
  | 'diger';

export interface YapiBilgileri {
  sinif: YapiSinifi;
  kullanimAmaci: KullanimAmaci;
  toplamAlanM2: number;
  bodrumKat: number;
  zeminUstuKat: number;
  toplamYukseklikM: number;
  tasiyiciSistem: TasiyiciSistem;
  /** Deprem Tasarım Sınıfı (TBDY 2018 Tablo 3.2). */
  dts: 1 | 2 | 3 | 4;
  /** Bina Yükseklik Sınıfı (TBDY 2018 Tablo 3.3). */
  bys: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  sds?: number;
  sd1?: number;
  pga?: number;
}

export interface InsaatBilgileri {
  yapiRuhsatNo?: string;
  yapiRuhsatTarihi?: string;
  baslamaTarihi: string;
  bitisTarihi: string;
  toplamSureGun: number;
  maliyetTry: number;
}

export interface KisiBilgileri {
  adSoyad: string;
  /** TCKN (gerçek kişi) veya VKN (tüzel kişi). */
  tckn?: string;
  vkn?: string;
  adres: string;
  telefon?: string;
  eposta?: string;
}

export interface FirmaBilgileri {
  unvan: string;
  vkn: string;
  yetkiBelgesiSinifi?: string;
  yetkiBelgesiNo?: string;
  yetkili: {
    adSoyad: string;
    tckn?: string;
  };
  adres: string;
  telefon?: string;
  eposta?: string;
}

export interface YapiDenetimBilgileri extends FirmaBilgileri {
  izinBelgesiNo: string;
  sorumluMuhendis: {
    adSoyad: string;
    odaSicilNo: string;
    tckn?: string;
  };
}

export interface Ek3Form {
  id: string;
  projectId: string;
  orgId: string;
  version: number;
  status: Ek3Status;

  proje: ProjeBilgileri;
  yapi: YapiBilgileri;
  insaat: InsaatBilgileri;
  sahibi: KisiBilgileri;
  muteahhit: FirmaBilgileri;
  denetim: YapiDenetimBilgileri;

  generatedAt?: string;
  pdfUrl?: string;
  supersededBy?: string;
  supersedes?: string;
  revisionReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Subset persisted as `ek3_forms.form_data` JSONB. */
export type Ek3FormData = Pick<
  Ek3Form,
  'proje' | 'yapi' | 'insaat' | 'sahibi' | 'muteahhit' | 'denetim'
>;

/** Form-step keys — used by the wizard UI. */
export const EK3_STEPS = ['proje', 'yapi', 'insaat', 'sahibi', 'muteahhit', 'denetim'] as const;
export type Ek3Step = (typeof EK3_STEPS)[number];

export interface FirmaSablon {
  id: string;
  orgId: string;
  type: 'muteahhit' | 'denetim';
  name: string;
  data: FirmaBilgileri | YapiDenetimBilgileri;
  createdAt: string;
}
