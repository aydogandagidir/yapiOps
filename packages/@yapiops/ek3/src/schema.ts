import { z } from 'zod';

import { isValidTckn, isValidVkn } from './validators';

/**
 * Zod schema for the Ek-3 form payload — strict on completion (PDF generate),
 * partial-tolerant on autosave (PATCH `/api/ek3/[id]`).
 *
 * Türkiye coordinate bounds: lat ∈ [35, 43], lng ∈ [25, 45] (TÜRKAK).
 */

const tcknSchema = z
  .string()
  .regex(/^[1-9]\d{10}$/, 'TCKN 11 haneli, ilk hane 0 olmamalı')
  .refine(isValidTckn, 'TCKN algoritma kontrolü başarısız');

const vknSchema = z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayı olmalı').refine(isValidVkn, 'Geçersiz VKN');

const tcknOrVkn = z
  .object({ tckn: tcknSchema.optional(), vkn: vknSchema.optional() })
  .refine((v) => v.tckn != null || v.vkn != null, 'TCKN veya VKN zorunlu');

export const KoordinatSchema = z.object({
  lat: z.number().min(35, 'Türkiye sınırları dışında').max(43, 'Türkiye sınırları dışında'),
  lng: z.number().min(25, 'Türkiye sınırları dışında').max(45, 'Türkiye sınırları dışında'),
});

export const ProjeSchema = z.object({
  ad: z.string().min(3, 'En az 3 karakter').max(200),
  il: z.string().min(2),
  ilce: z.string().min(2),
  mahalle: z.string().optional(),
  pafta: z.string().optional(),
  ada: z.string().min(1),
  parsel: z.string().min(1),
  koordinat: KoordinatSchema.optional(),
  imarDurumu: z.string().optional(),
});

export const YapiSchema = z.object({
  sinif: z.enum(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A']),
  kullanimAmaci: z.enum([
    'konut',
    'ticaret',
    'sanayi',
    'saglik',
    'egitim',
    'turizm',
    'ofis',
    'karma',
    'diger',
  ]),
  toplamAlanM2: z.number().positive('Pozitif olmalı'),
  bodrumKat: z.number().int().min(0),
  zeminUstuKat: z.number().int().min(0),
  toplamYukseklikM: z.number().positive(),
  tasiyiciSistem: z.enum(['BAC', 'BAP', 'BAC-BAP', 'YIGMA', 'CELIK', 'KARMA']),
  dts: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  bys: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ]),
  sds: z.number().positive().optional(),
  sd1: z.number().positive().optional(),
  pga: z.number().positive().optional(),
});

export const InsaatSchema = z.object({
  yapiRuhsatNo: z.string().optional(),
  yapiRuhsatTarihi: z.string().optional(),
  baslamaTarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD biçiminde olmalı'),
  bitisTarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD biçiminde olmalı'),
  toplamSureGun: z.number().int().positive(),
  maliyetTry: z.number().nonnegative(),
});

const baseKisi = z.object({
  adSoyad: z.string().min(3),
  adres: z.string().min(5),
  telefon: z.string().optional(),
  eposta: z.string().email().optional().or(z.literal('')),
});

export const SahibiSchema = baseKisi.merge(
  z.object({ tckn: tcknSchema.optional(), vkn: vknSchema.optional() }),
).superRefine((v, ctx) => {
  if (v.tckn == null && v.vkn == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'TCKN veya VKN zorunlu',
      path: ['tckn'],
    });
  }
});

export const FirmaSchema = z.object({
  unvan: z.string().min(2),
  vkn: vknSchema,
  yetkiBelgesiSinifi: z.string().optional(),
  yetkiBelgesiNo: z.string().optional(),
  yetkili: z.object({
    adSoyad: z.string().min(3),
    tckn: tcknSchema.optional(),
  }),
  adres: z.string().min(5),
  telefon: z.string().optional(),
  eposta: z.string().email().optional().or(z.literal('')),
});

export const YapiDenetimSchema = FirmaSchema.extend({
  izinBelgesiNo: z.string().min(1, 'İzin belgesi no zorunlu'),
  sorumluMuhendis: z.object({
    adSoyad: z.string().min(3),
    odaSicilNo: z.string().min(1),
    tckn: tcknSchema.optional(),
  }),
});

export const Ek3FormDataSchema = z.object({
  proje: ProjeSchema,
  yapi: YapiSchema,
  insaat: InsaatSchema,
  sahibi: SahibiSchema,
  muteahhit: FirmaSchema,
  denetim: YapiDenetimSchema,
});

/** Partial variant — used for step-based autosave PATCH requests. */
export const Ek3FormDataPartialSchema = z.object({
  proje: ProjeSchema.partial().optional(),
  yapi: YapiSchema.partial().optional(),
  insaat: InsaatSchema.partial().optional(),
  sahibi: SahibiSchema.optional(),
  muteahhit: FirmaSchema.partial().optional(),
  denetim: YapiDenetimSchema.partial().optional(),
});

export const Ek3CreateInputSchema = z.object({
  projectId: z.string().uuid(),
  formData: Ek3FormDataPartialSchema.optional(),
});

export const Ek3PatchInputSchema = z.object({
  formData: Ek3FormDataPartialSchema,
});

export const Ek3ReviseInputSchema = z.object({
  revisionReason: z.string().min(5, 'Gerekçe en az 5 karakter'),
  formData: Ek3FormDataPartialSchema.optional(),
});

export const FirmaSablonCreateSchema = z.object({
  type: z.enum(['muteahhit', 'denetim']),
  name: z.string().min(2),
  data: z.union([FirmaSchema, YapiDenetimSchema]),
});

/** ETABS bridge import payload. Schema is intentionally loose (Hafta 8). */
export const Ek3EtabsImportSchema = z.object({
  projectId: z.string().uuid(),
  ek3FormId: z.string().uuid().optional(),
  source: z.literal('desktop-bridge'),
  bridgeVersion: z.string(),
  etabs: z.object({
    fileName: z.string(),
    etabsVersion: z.string().optional(),
    metadata: z
      .object({
        toplamAlanM2: z.number().positive().optional(),
        bodrumKat: z.number().int().min(0).optional(),
        zeminUstuKat: z.number().int().min(0).optional(),
        toplamYukseklikM: z.number().positive().optional(),
        tasiyiciSistem: z.enum(['BAC', 'BAP', 'BAC-BAP', 'YIGMA', 'CELIK', 'KARMA']).optional(),
        sds: z.number().positive().optional(),
        sd1: z.number().positive().optional(),
        koordinat: KoordinatSchema.optional(),
      })
      .optional(),
  }),
});

export { tcknOrVkn };
