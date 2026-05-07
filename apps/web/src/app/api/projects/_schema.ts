import { z } from 'zod';

/**
 * Project domain shape — mirrors `projects` table in 0001 migration.
 * Yapı/DTS/BYS gibi alanlar Ek-3 sihirbazıyla doldurulup oraya yazılır;
 * proje seviyesinde sadece tanımlayıcı ve konum bilgisi tutulur.
 */
export const ProjectCreateSchema = z.object({
  name: z.string().min(3, 'En az 3 karakter').max(200),
  pafta_no: z.string().max(50).optional(),
  ada_no: z.string().max(50).optional(),
  parsel_no: z.string().max(50).optional(),
  il: z.string().max(50).optional(),
  ilce: z.string().max(100).optional(),
  mahalle: z.string().max(100).optional(),
  toplam_alan_m2: z.number().positive().optional(),
  bodrum_kat_sayisi: z.number().int().min(0).optional(),
  zemin_ustu_kat_sayisi: z.number().int().min(0).optional(),
  toplam_yukseklik_m: z.number().positive().optional(),
  tasiyici_sistem: z.string().max(50).optional(),
  dts: z.number().int().min(1).max(4).optional(),
  bys: z.number().int().min(1).max(8).optional(),
  latitude: z.number().min(35).max(43).optional(),
  longitude: z.number().min(25).max(45).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;
