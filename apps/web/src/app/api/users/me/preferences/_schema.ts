import { z } from 'zod';

/**
 * Kullanıcı bildirim tercihleri patch şeması. Sadece bilinen anahtarlar
 * kabul edilir; bilinmeyen alanlar (ileride eklenecek e-posta türleri)
 * route'un JSONB merge mantığı sayesinde silinmeden korunur.
 */
export const PreferencesPatchSchema = z.object({
  email_ek3_generated: z.boolean().optional(),
  email_weekly_digest: z.boolean().optional(),
});

export type PreferencesPatch = z.infer<typeof PreferencesPatchSchema>;
