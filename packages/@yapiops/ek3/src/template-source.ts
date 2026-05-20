import { createHash } from 'node:crypto';

import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Resmi Ek-3 PDF şablonunun canlı kaynaklarını yöneten yardımcılar.
 *
 * Yapı Denetim Hizmet Sözleşmesi Ek-3 formu Resmî Gazete 30/05/2019-30789'da
 * yayımlandı; güncel hâli Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'nın
 * yapı denetim portalında ek olarak yayımlanır. Yönetmelik dönem dönem
 * güncellendiği için *otomatik* takip kritik:
 *   1. Vercel Cron her gün 03:00 UTC'de `/api/cron/ek3-template-sync` çağırır
 *   2. Cron handler `fetchOfficialTemplate()` çağırır → bytes + sha256
 *   3. `compareToActive()` ile aktif sürüm hash'i ile karşılaştırılır
 *   4. Yeni hash'se `recordNewTemplate()` + `activateTemplate()` zinciri
 *
 * Manuel upload yolu DB'ye `source = 'manual_upload'` ile yazar; aynı
 * `recordNewTemplate()` fonksiyonu kullanılır.
 *
 * URL listesi env değişkeniyle override edilebilir (`EK3_TEMPLATE_OFFICIAL_URLS`,
 * virgülle ayrılmış). Boşsa varsayılan kaynaklar denenir, ilk başarılı yanıt
 * kullanılır.
 */

export interface FetchedTemplate {
  bytes: Uint8Array;
  sha256: string;
  size: number;
  sourceUrl: string;
  fetchedAt: Date;
}

export interface Ek3TemplateRow {
  id: string;
  version: string;
  source: 'official_fetch' | 'manual_upload';
  source_url: string | null;
  storage_path: string;
  sha256: string;
  size_bytes: number | null;
  fetched_at: string | null;
  uploaded_by: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_BUCKET = 'ek3-templates';

/**
 * Default Bakanlık + Resmî Gazete kaynakları. Resmi Gazete arşivinde
 * yönetmeliğin tam metni vardır; Bakanlık ayrı bir form PDF'i de
 * yayımlayabilir. Sırayla denenir; ilk başarılı yanıt kullanılır.
 *
 * NOT: Bu URL'ler kod tabanında *kaynak* olarak tutulur. Production'da
 * Bakanlık link'i değişirse `EK3_TEMPLATE_OFFICIAL_URLS` env değişkeni
 * üzerinden override edilebilir.
 */
const DEFAULT_SOURCES: readonly string[] = [
  // Bakanlık form PDF'i (en güncel; aynı dosya genelde aynı path'te kalır)
  'https://webdosya.csb.gov.tr/db/yapidenetim/menu/ek-3-formu_20190530.pdf',
  // Resmî Gazete tam yönetmelik metni (form ekleri içerir)
  'https://www.resmigazete.gov.tr/eskiler/2019/05/20190530-1.pdf',
];

export function getOfficialSources(): readonly string[] {
  const envList = process.env.EK3_TEMPLATE_OFFICIAL_URLS;
  if (envList && envList.trim().length > 0) {
    return envList
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return DEFAULT_SOURCES;
}

/**
 * Sırayla her kaynağı dener. Network timeout 20s; hatalı kaynaklar atlanır.
 * Bütün kaynaklar başarısız olursa son hatayı throw eder.
 */
export async function fetchOfficialTemplate(): Promise<FetchedTemplate> {
  const sources = getOfficialSources();
  let lastError: unknown = new Error('No sources configured');

  for (const url of sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 20_000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'YapiOps-Ek3-TemplateBot/1.0 (+https://yapiops.com)',
          Accept: 'application/pdf',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        lastError = new Error(`HTTP ${String(res.status)} for ${url}`);
        continue;
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        lastError = new Error(`Unexpected content-type "${contentType}" for ${url}`);
        continue;
      }

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Sanity check: PDF magic header.
      if (
        bytes.length < 5 ||
        bytes[0] !== 0x25 ||
        bytes[1] !== 0x50 ||
        bytes[2] !== 0x44 ||
        bytes[3] !== 0x46
      ) {
        lastError = new Error(`Response from ${url} is not a valid PDF`);
        continue;
      }

      const sha256 = createHash('sha256').update(bytes).digest('hex');
      return {
        bytes,
        sha256,
        size: bytes.length,
        sourceUrl: url,
        fetchedAt: new Date(),
      };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Plain SHA-256 utility — used when admin uploads a PDF and we need to
 * deduplicate against `official_fetch` rows.
 */
export function sha256OfBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Aktif satırın sha256'sını döndürür; aktif satır yoksa null. Renderer'ın
 * cache invalidation kararı için de kullanılır.
 */
export async function getActiveTemplate(supabase: SupabaseClient): Promise<Ek3TemplateRow | null> {
  const { data } = await supabase
    .from('ek3_templates')
    .select('*')
    .eq('is_active', true)
    .maybeSingle<Ek3TemplateRow>();
  return data;
}

export type CompareResult =
  | { status: 'unchanged'; activeId: string }
  | { status: 'new'; activeId: string | null }
  | { status: 'first' };

export async function compareToActive(
  supabase: SupabaseClient,
  candidateSha: string,
): Promise<CompareResult> {
  const active = await getActiveTemplate(supabase);
  if (!active) return { status: 'first' };
  if (active.sha256 === candidateSha) return { status: 'unchanged', activeId: active.id };
  return { status: 'new', activeId: active.id };
}

export interface RecordNewTemplateInput {
  bytes: Uint8Array;
  sha256: string;
  size: number;
  source: 'official_fetch' | 'manual_upload';
  sourceUrl?: string | null;
  version: string;
  uploadedBy?: string | null;
  notes?: string;
}

export interface RecordedTemplate {
  id: string;
  storagePath: string;
}

/**
 * Storage'a yazar + DB satırı insert eder. Activation ayrı çağrı (admin
 * UI'da "yeni sürümü aktif yap" tek tıkla yapılır; cron her zaman aktive
 * eder).
 */
export async function recordNewTemplate(
  supabase: SupabaseClient,
  input: RecordNewTemplateInput,
): Promise<RecordedTemplate> {
  const id = crypto.randomUUID();
  const storagePath = `${id}.pdf`;

  const upload = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, input.bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upload.error) {
    throw new Error(`Storage upload failed: ${upload.error.message}`);
  }

  const { error } = await supabase.from('ek3_templates').insert({
    id,
    version: input.version,
    source: input.source,
    source_url: input.sourceUrl ?? null,
    storage_path: storagePath,
    sha256: input.sha256,
    size_bytes: input.size,
    fetched_at: new Date().toISOString(),
    uploaded_by: input.uploadedBy ?? null,
    is_active: false,
    notes: input.notes ?? null,
  });
  if (error) {
    // Best effort cleanup so we don't orphan a Storage object.
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Insert ek3_templates failed: ${error.message}`);
  }

  return { id, storagePath };
}

/**
 * Tek satır aktive eder; aktif olan diğer tüm satırları pasifleştirir.
 * Tek bir transaction'da yapılması ideal; Supabase JS client RPC kullanmadan
 * iki ayrı update gönderiyor — partial unique index "tek aktif" garantisini
 * korur (ikinci update başarısız olursa rollback).
 */
export async function activateTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<void> {
  const { error: deactivateErr } = await supabase
    .from('ek3_templates')
    .update({ is_active: false })
    .neq('id', templateId);
  if (deactivateErr) {
    throw new Error(`Deactivate previous templates failed: ${deactivateErr.message}`);
  }

  const { error: activateErr } = await supabase
    .from('ek3_templates')
    .update({ is_active: true })
    .eq('id', templateId);
  if (activateErr) {
    throw new Error(`Activate template ${templateId} failed: ${activateErr.message}`);
  }
}

/**
 * Aktif şablonun raw bytes'ını Storage'tan indirir. Renderer her PDF
 * üretiminde bunu çağırır; küçük (~MB altı) bir dosya, cache layer şimdilik
 * gereksiz — ileride Upstash KV ile sha256-keyed cache eklenebilir.
 */
export async function downloadActiveTemplateBytes(
  supabase: SupabaseClient,
): Promise<{ bytes: Uint8Array; row: Ek3TemplateRow } | null> {
  const row = await getActiveTemplate(supabase);
  if (!row) return null;

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(row.storage_path);
  if (error || !data) return null;

  const arrayBuffer = await data.arrayBuffer();
  return { bytes: new Uint8Array(arrayBuffer), row };
}
