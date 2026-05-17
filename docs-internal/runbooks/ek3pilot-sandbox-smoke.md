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
3. **Sihirbazı baştan sona doldur:**
   - Proje: il/ilçe/ada/parsel + lat/lng (39.92, 32.85 — Ankara)
   - Yapı: 3A / konut / 1240 m² / 1 bodrum / 5 zemin üstü / 16.4 m / BAC / DTS=2 / BYS=7 / Sds=0.62
   - İnşaat: tarihler + maliyet
   - Sahibi: TCKN için test vektörü `12345678950` (geçerli) veya VKN `1234567890`
   - Müteahhit: VKN + yetkili
   - Denetim: VKN + izin belgesi no + sorumlu mühendis (oda sicil)
4. Her step'te 800ms sonra "Otomatik kaydedildi" işareti görünmeli.
5. Son step'te "PDF Üret" → quota check (Free planda 3/ay) → renderer aktif şablon kullanır.

## 6) Doğrulama matrisi

| Kontrol                     | Beklenen                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/tr/ek3pilot/[id]/preview` | Iframe'de PDF açılır. AcroForm yolu çalışıyorsa Bakanlık formu üzerine alanlar yazılı; yolu yoksa HTML-fallback (Türkçe transliterate) |
| `ek3_forms` tablosu         | `status='completed'`, `pdf_url` set, `generated_at` dolu                                                                               |
| Storage `ek3-pdfs` bucket   | `{org_id}/{project_id}/{ek3_id}.pdf` mevcut                                                                                            |
| `usage_records` tablosu     | Bu org için bu ay 1 satır, `feature='ek3.generated'`, `metadata.templateSource = 'db_active'` (veya `public_file`/`none`)              |
| `audit_logs` tablosu        | `ek3.created`, `ek3.updated` (her step), `ek3.generated` kayıtları sırayla                                                             |
| `/tr/settings/audit`        | Yukarıdakileri yansıtır                                                                                                                |

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

## 11) Telemetri akış kontrolü

**Önkoşul:** `.env.local`'da `NEXT_PUBLIC_POSTHOG_KEY` + `SENTRY_DSN` set edilmiş olsun (yoksa ilgili istemci no-op'a düşer ve bu adım atlanır).

1. Cookie consent banner'ında "Kabul et" tıkla — `localStorage.yapiops:cookie-consent = 'accepted'` set olur.
2. Browser DevTools → Network → `eu.posthog.com` filtresi: dashboard'a girince `/decide` ve sonra `/e/` POST'larını gör.
3. Sihirbazda PDF üret → server `captureServerEvent('ek3_generated', ...)` çağrılır. PostHog dashboard → "Live events" sekmesinde:
   - `ek3_created` (sihirbaza başladığında)
   - `ek3_generated` (PDF üretildiğinde, `templateSource`, `strategy`, `version` property'leriyle)
   - Her iki event'in `distinct_id` değeri **org_id** olmalı; `properties.userId` ayrı alanda kullanıcının id'si.
4. Free planda 4. PDF üretmeyi dene → `quota_exceeded` event'i + Sentry breadcrumb (`category: 'ek3', action: 'quota_exceeded'`) görünmeli.
5. Şablon sync'ini tetikle (`/tr/settings/ek3-templates` → "Şimdi Senkronize Et"):
   - Başarılı: `ek3_template_synced` event + Sentry breadcrumb.
   - Başarısız (Bakanlık endpoint ulaşılamıyor): Sentry "Issues" sekmesinde `feature: ek3_template` tag'li `warning` seviyesinde issue.

### Beklenen

- PostHog'da org-level segmentasyon doğru: aynı org'un tüm kullanıcıları aynı `distinct_id` altında toplanır.
- Sentry'de `feature` tag'i ile filtreleme yapılınca sadece ek3 / ek3_template / quota event'leri görünür.

## 12) E-posta tercihleri (opt-out doğrulama)

**Önkoşul:** `RESEND_API_KEY` + `EMAIL_FROM` set edilmiş olsun.

### Default opt-in (KVKK transactional)

1. Yeni signup → kullanıcı `users.preferences.email_ek3_generated = true` ile başlar (0005 migration default).
2. Sihirbazda PDF üret → Resend dashboard ya da inbox'ta "Ek-3 PDF üretildi" konulu e-posta. TR locale'de "Merhaba {ad}, {proje} projesi için Ek-3 v1 formu üretildi…".
3. E-posta footer'ında "İletişim tercihlerini değiştirmek için tıklayın" linki → `/{locale}/settings/notifications`'a yönlendirir.

### Opt-out

1. `/tr/settings/notifications` aç.
2. "Ek-3 PDF üretildiğinde e-posta gönder" toggle'ını kapat → "Kaydet".
3. PATCH `/api/users/me/preferences` body: `{"email_ek3_generated": false}` → 200 OK + güncel preferences.
4. Yeni Ek-3 üret → e-posta **gönderilmemeli**. `ek3.generated` audit + PostHog event yine yazılmalı.

### Beklenen edge case'ler

| Senaryo                     | Beklenen davranış                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY` boş        | `sendEk3GeneratedEmail()` `{ status: 'skipped', reason: 'no_api_key' }` döner; PDF üretimi devam eder; Sentry'ye exception **düşmez**                  |
| Kullanıcı `users.email` yok | Aynı şekilde `skipped` (`reason: 'no_recipient'`) — PDF response'u bloklanmaz                                                                          |
| Resend API 429 / 5xx        | Sentry'de `feature: notifications, kind: ek3_generated_email` tag'li exception; PDF response'u **bloklanmaz** (kullanıcı zaten preview'da PDF'i görür) |

### KVKK kontrolleri

- Footer linki çalışıyor mu? (preferences sayfasına ulaşır mı)
- E-posta görünür "İletişim tercihleri" mesajı içeriyor mu?
- `users.preferences` JSONB merge sırasında diğer key'ler (örn. ileride `email_invoice_issued`) silinmemiş mi?

## Sorun giderme

| Belirti                                                                       | Olası neden                                                   | Çözüm                                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `supabase start` "port in use"                                                | Önceki Supabase instance                                      | `supabase stop`                                                                                    |
| `ek3-pdfs` bucket bulunamadı                                                  | Manuel oluşturulmadı                                          | Studio → Storage → New bucket                                                                      |
| Otomatik sync `fetch_failed`                                                  | Bakanlık endpoint geçici hata / firewall                      | Manuel upload kullan; `EK3_TEMPLATE_OFFICIAL_URLS` ile alternatif kaynak ekle                      |
| PDF Türkçe karakterleri "?" görünüyor                                         | Renderer HTML-fallback yolunda (template yok)                 | DB'de aktif şablon olduğundan emin ol                                                              |
| `ek3.generated` audit yok ama PDF üretildi                                    | Audit yazımı `try/catch` ile sessize alındı (Sentry'ye düşer) | Sentry log'una bak; service-role yetkisi kontrol et                                                |
| PostHog'a event gitmiyor                                                      | `NEXT_PUBLIC_POSTHOG_KEY` boş veya cookie consent verilmemiş  | `localStorage.yapiops:cookie-consent` ve env değerini kontrol et                                   |
| Sentry breadcrumb görünmüyor                                                  | `SENTRY_DSN` env yok veya sample rate 0                       | `sentry.server.config.ts`'te DSN'i doğrula                                                         |
| E-posta gelmiyor ama log'da error yok                                         | Kullanıcı opt-out etti veya `RESEND_API_KEY` boş              | `users.preferences.email_ek3_generated` + env değerini doğrula                                     |
| `data(ek3): TBDY 3.3 matrisi` commit'i öncesi DTS=2/3/4 yapısında BYS uyarısı | `BYS_MATRIX[dts]` boş                                         | `bysConsistency()` "doğrulanmamış" warning'i bekleniyor; Hafta 9.2.b commit'i sonrası matris dolar |
