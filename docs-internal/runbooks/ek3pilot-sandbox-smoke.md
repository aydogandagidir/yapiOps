# Runbook: Ek3Pilot Sandbox Uçtan Uca Smoke

> **Amaç:** Hafta 5–7'de eklenen Ek3Pilot web tarafının (paketler + 9 API + sihirbaz UI + şablon otomasyonu) yerel ortamda uçtan uca çalıştığını doğrulamak.
> **Hedef:** Faz 1 design partner onboarding'i (Hafta 10) başlamadan önce kritik akışlarda regresyon olmadığını teyit.

## Ön Gereksinimler

- Docker Desktop çalışır halde (Supabase local için).
- Node 20+, pnpm 9+.
- `.env.example`'i `.env.local` olarak kopyala (`apps/web/.env.local`) ve aşağıdaki minimum değerleri doldur:
  - `NEXT_PUBLIC_SUPABASE_URL` (supabase start sonrası terminale yazar)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET=$(openssl rand -hex 32)`
  - `SYSTEM_ORG_ID=00000000-0000-0000-0000-000000000000`
  - `EK3_TEMPLATE_OFFICIAL_URLS` boş (varsayılan kaynaklar denenecek)
- (Opsiyonel) Iyzico sandbox key'leri ve Resend API key — Faz 0 smoke için gerekli, Ek3Pilot smoke'u için gerekmiyor.

## 1) Supabase'i ayağa kaldır

```bash
cd <repo-root>
supabase start
# çıktıdaki API URL + anon key + service role key'i .env.local'a yapıştır
pnpm db:migrate     # 0001..0004 uygulanır (0004 ek3-templates + ek3-pdfs bucket'larını oluşturur)
```

> **Not:** 0004_storage_buckets migration'ı `ek3-templates` ve `ek3-pdfs` bucket'larını + RLS politikalarını otomatik oluşturur. Manuel Supabase Studio adımı **gerekmez**.

## 2) Web app'i başlat

```bash
pnpm dev
# http://localhost:3000 → /tr/login redirect
```

## 3) Org oluştur (Faz 0 akışı)

1. `/tr/signup` → form doldur (KVKK onay zorunlu).
2. Doğrulama e-postası — local'de Supabase Inbucket'ı kontrol et: `http://localhost:54324`.
3. E-posta doğrulama bağlantısına tıkla → otomatik `/tr/dashboard`'a redirect; 14 gün trial banner'ı görünmeli.

## 4) Şablon kaydı (otomatik veya manuel)

### Otomatik sync
1. `/tr/settings/ek3-templates` aç.
2. "Şimdi Senkronize Et" butonuna tıkla.
3. Beklenen senaryolar:
   - **Bakanlık endpoint'i ulaşılabilirse**: `status: 'first'` veya `'new'` → `ek3_templates` tablosunda 1 satır + Storage'ta dosya + `is_active = true`.
   - **Endpoint yanıt vermezse** (geliştirici makinesinde firewall, vs.): `status: 'fetch_failed'` mesajı görünür → Manuel upload'a geç.

### Manuel upload (her zaman çalışır)
1. Aynı sayfada "Manuel Yükleme" bölümünden bir Ek-3 PDF'i seç (Bakanlık form PDF'i veya elinde olan herhangi bir Ek-3).
2. Sürüm: `2026-05-test-1`, Notes: `Sandbox doğrulaması`.
3. "Yükle ve Aktive Et" → `ek3_templates`'te yeni satır, `is_active = true`.

### Kontrol
- `/tr/settings/audit` → Son işlemler arasında `ek3_template.uploaded` ve `ek3_template.activated` görünmeli.

## 5) Ek-3 üretim akışı

1. Sidebar → "Projeler" → "Yeni Proje" → ad + il/ilçe + ada/parsel doldur → "Projeyi Oluştur".
2. Sidebar → "Ek-3 Pilot" → "Yeni Ek-3" → projeyi seç → "Oluştur" → `/tr/ek3pilot/[id]`.
4. **Sihirbazı baştan sona doldur:**
   - Proje: il/ilçe/ada/parsel + lat/lng (39.92, 32.85 — Ankara)
   - Yapı: 3A / konut / 1240 m² / 1 bodrum / 5 zemin üstü / 16.4 m / BAC / DTS=2 / BYS=7 / Sds=0.62
   - İnşaat: tarihler + maliyet
   - Sahibi: TCKN için test vektörü `12345678950` (geçerli) veya VKN `1234567890`
   - Müteahhit: VKN + yetkili
   - Denetim: VKN + izin belgesi no + sorumlu mühendis (oda sicil)
5. Her step'te 800ms sonra "Otomatik kaydedildi" işareti görünmeli.
6. Son step'te "PDF Üret" → quota check (Free planda 3/ay) → renderer aktif şablon kullanır.

## 6) Doğrulama matrisi

| Kontrol | Beklenen |
|---|---|
| `/tr/ek3pilot/[id]/preview` | Iframe'de PDF açılır. AcroForm yolu çalışıyorsa Bakanlık formu üzerine alanlar yazılı; yolu yoksa HTML-fallback (Türkçe transliterate) |
| `ek3_forms` tablosu | `status='completed'`, `pdf_url` set, `generated_at` dolu |
| Storage `ek3-pdfs` bucket | `{org_id}/{project_id}/{ek3_id}.pdf` mevcut |
| `usage_records` tablosu | Bu org için bu ay 1 satır, `feature='ek3.generated'`, `metadata.templateSource = 'db_active'` (veya `public_file`/`none`) |
| `audit_logs` tablosu | `ek3.created`, `ek3.updated` (her step), `ek3.generated` kayıtları sırayla |
| `/tr/settings/audit` | Yukarıdakileri yansıtır |

## 7) Quota testi (Free plan)

1. Aynı kullanıcı 4. Ek-3'ü üretmeye çalışsın → API 402 döner, UI'da "Aylık Ek-3 limitinize ulaştınız (3/3)" mesajı.
2. `usage_records` ay sayacı doğru kalmalı (4. üretim **eklenmemeli**).

## 8) RLS doğrulaması

1. Yeni bir browser profile (veya gizli pencere) ile ikinci bir signup → ikinci org.
2. İkinci kullanıcı, birinci kullanıcının Ek-3 ID'sini direkt URL ile aç (`/tr/ek3pilot/<first-user-ek3-id>`) → 404 / "not_found".
3. API tarafından da: `curl ... -H "cookie: <ikinci-user-session>"` → 404.

## 9) Revize akışı

1. Tamamlanmış bir Ek-3'te (status `completed`) → "Yeni Sürüm Oluştur" → revize gerekçesi (≥5 karakter) → yeni v2 satırı.
2. Eski satır `status='superseded'`, `superseded_by` set; yeni satır `supersedes` ile bağlı.
3. `audit_logs`'ta `ek3.revised` kaydı, metadata'da `previousVersion` ve `newVersion`.

## 10) Cron testi (manuel tetikleme)

```bash
curl -X GET 'http://localhost:3000/api/cron/ek3-template-sync' \
  -H "Authorization: Bearer ${CRON_SECRET}"
# Beklenen: 200 + { status: 'unchanged' | 'new' | 'first' | 'fetch_failed' }
# 401 dönerse Authorization header'ını kontrol et.
```

## Çıkış kriterleri

- Adım 5–9 sıfır hata ile tamamlanır.
- Üretilen PDF e-imza yazılımıyla (E-İmzaTR demo) açılıp imzalanabilir (manuel kontrol — DoD).
- Vercel preview deploy'unda `vercel.json` cron'u "Cron Jobs" sekmesinde görünür.

## Sorun giderme

| Belirti | Olası neden | Çözüm |
|---|---|---|
| `supabase start` "port in use" | Önceki Supabase instance | `supabase stop` |
| `ek3-pdfs` bucket bulunamadı | Manuel oluşturulmadı | Studio → Storage → New bucket |
| Otomatik sync `fetch_failed` | Bakanlık endpoint geçici hata / firewall | Manuel upload kullan; `EK3_TEMPLATE_OFFICIAL_URLS` ile alternatif kaynak ekle |
| PDF Türkçe karakterleri "?" görünüyor | Renderer HTML-fallback yolunda (template yok) | DB'de aktif şablon olduğundan emin ol |
| `ek3.generated` audit yok ama PDF üretildi | Audit yazımı `try/catch` ile sessize alındı (Sentry'ye düşer) | Sentry log'una bak; service-role yetkisi kontrol et |
