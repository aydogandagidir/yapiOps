# Faz 1 — DoD Test Runbook

Bu doküman **Faz 1 (Ek3Pilot MVP) Definition of Done** maddelerini canlı uçtan
uca doğrulamak için adım adım rehberdir. Production: <https://yapiops.bluedev.dev>

> **Önkoşul:** Tüm gerekli Vercel env değişkenleri girilmiş olmalı (bkz.
> [`env-vars.md`](./env-vars.md)). Iyzico ve Foriba sandbox kredensiyaliniz
> tarayıcı yer-imlerinde / parola yöneticinizde hazır olsun.

---

## D1 — Iyzico Sandbox 3DS Ödeme

**Amaç:** Abonelik akışının end-to-end çalıştığını doğrulamak.

### Önkoşul

- Vercel env: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` (sandbox modu), `IYZICO_WEBHOOK_SECRET`
- Test kullanıcısı: `info@bluedev.dev` veya yeni bir hesap

### Adımlar

1. <https://yapiops.bluedev.dev/tr/login> ile giriş yap.
2. Dashboard sağ üstündeki "Plan yükselt" veya `/tr/billing/upgrade` rotasına git.
3. **Office Aylık** planını seç → "Planı Seç" butonu.
4. Iyzico'nun yönlendirdiği sandbox 3DS ekranında **Iyzico'nun test kart
   numaralarından birini** kullan:
   - Numara: `5528790000000008`
   - Son: `12/30`, CVV: `123`, SMS kod: `123456`
5. Onayla → app'e geri yönlendirme.

### Beklenen sonuç

- URL: `/tr/billing/checkout/success`
- Dashboard'da abonelik durumu **"Active"** görünür (önceden "trialing" idi).
- Production DB:
  ```sql
  select status, plan_code, current_period_end from subscriptions
  where org_id = '<org-uuid>';
  -- → active, office_monthly, ~30 gün sonrası
  ```
- Audit log:
  ```sql
  select action, resource_type, created_at from audit_logs
  where org_id = '<org-uuid>' order by created_at desc limit 5;
  -- → subscription.payment_succeeded
  ```

### Başarısızlık → bak

- Vercel runtime log: 500 hatası varsa Iyzico env'leri kontrol et.
- Iyzico webhook URL'i `https://yapiops.bluedev.dev/api/webhooks/iyzico` olmalı.
- `IYZICO_WEBHOOK_SECRET` yoksa webhook 500 döner; logları kontrol et.

---

## D2 — Foriba E-fatura Sandbox

**Amaç:** Iyzico ödemesi sonrası e-fatura otomatik kesilir.

### Önkoşul

- D1 başarılı (subscriptions.status = active).
- Vercel env: `FORIBA_USERNAME`, `FORIBA_PASSWORD`, `FORIBA_BASE_URL` (sandbox).

### Adımlar

1. D1 sonrasında ~30 sn bekle (Foriba webhook'u tetiklenir).
2. Dashboard → `/tr/billing` → "Fatura Geçmişi" bölümüne bak.

### Beklenen sonuç

- Geçmişte yeni bir satır görünür: tarih + tutar + e-fatura ETTN/UUID.
- `invoices` tablosunda kayıt:
  ```sql
  select e_invoice_uuid, e_invoice_status, amount_try from invoices
  where org_id = '<org-uuid>' order by issued_at desc limit 1;
  -- → uuid var, e_invoice_status='ok', amount_try=2500
  ```

### Başarısızlık → bak

- `e_invoice_status='pending'` → Foriba henüz işlemedi; 5 dk bekle.
- `e_invoice_status='failed'` → Vercel log: Foriba response detayı.

---

## D3 — Resend Custom Domain E-posta Teslimatı

**Amaç:** Custom SMTP (Resend → noreply@bluedev.dev) %100 teslimat.

### Önkoşul

- Supabase Dashboard → Email Templates 4'ü Türkçe (Confirm sign up, Reset password, Magic link, Change email).
- Resend dashboard: domain `bluedev.dev` Verified.

### Adımlar

1. Yeni bir e-posta ile signup: `https://yapiops.bluedev.dev/tr/signup`
2. Inbox'a düşen "**YapıOps hesabınızı doğrulayın**" mailini aç.
3. Resend dashboard → "Logs" sekmesi → ilgili mail için status: **Delivered**.
4. Mail içerikten link tıkla → `/tr/dashboard`'a gelir.

### Beklenen sonuç

- 5 farklı e-posta provider'ına (gmail, outlook, yandex, kurumsal) teslim 5/5.
- Gönderen `noreply@bluedev.dev`, konu Türkçe.
- Tüm Türkçe karakterler (ş ğ ı İ ç ö ü) düzgün görünür.

---

## D4 — Uçtan Uca Ek-3 Akışı (PDF dahil)

**Amaç:** Proje → Ek-3 → PDF flow eksiksiz çalışır; çıktı e-imza'ya hazır.

### Adımlar

1. `/tr/projects/new` → bir proje oluştur (Ad, İl, İlçe, Ada/Parsel, Taşıyıcı sistem).
2. `/tr/ek3pilot/new` → yeni oluşturulan projeyi seç → "Oluştur".
3. 6 adımı doldur:
   - **Proje**: kontrol et (otomatik geldi)
   - **Yapı**: sınıf, kat sayıları, DTS, BYS, Sds/Sd1/PGA
   - **İnşaat**: ruhsat no, tarihler, maliyet
   - **Sahibi**: ad, TCKN/VKN, adres
   - **Müteahhit**: ünvan, VKN, yetki belgesi, yetkili
   - **Denetim**: ünvan, VKN, izin belgesi no, sorumlu mühendis
4. Son adımda "PDF Üret" butonu.

### Beklenen sonuç

- URL: `/tr/ek3pilot/<id>/preview`
- Sayfa: PDF iframe'de yüklenir.
- "PDF İndir" → 20-30 KB tutarında bir PDF.
- Açtığında:
  - Başlık "YAPI DENETİM HİZMET SÖZLEŞMESİ EK-3"
  - Tüm Türkçe karakterler doğru (Çankaya, İmar, Müteahhidi, mühendis, vb.)
  - 6 bölüm başlıklı, etiket/değer satırları doğru
  - Sayfa altında imza alanları (3 sütun)
- E-imza yazılımı (E-İmzaTR) ile açılıp **imzalanabilmeli**.
- Audit log:
  ```sql
  select action from audit_logs where resource_type='ek3_form' order by created_at desc limit 3;
  -- → ek3.created, ek3.generated
  ```

---

## D5 — Free Plan Kota Limiti (4. Ek-3 → 402)

**Amaç:** Kota enforcement çalışır.

### Önkoşul

- Test org Free planda olmalı (abonelik trial veya cancel sonrası).

### Adımlar

1. 3 Ek-3 form üret (D4'ü 3 kez tekrarla).
2. 4. Ek-3'ü oluştur ve "PDF Üret" tıkla.

### Beklenen sonuç

- HTTP 402 yanıtı.
- UI'da kırmızı hata: **"Aylık Ek-3 limitinize ulaştınız (3/3). Plan yükseltmek için faturalama sayfasına gidin."**
- (Doğru `used/limit` değerleri — Sprint D-polish kota bug fix'i).
- PostHog event: `quota_exceeded` (props: feature=ek3Generations, used=3, limit=3).

---

## D6 — Sentry Event Akışı

**Amaç:** Hata izleme canlı.

### Önkoşul

- Vercel env: `SENTRY_DSN` (veya `NEXT_PUBLIC_SENTRY_DSN`).
- Sentry projesi: <https://sentry.io/organizations/.../projects/yapiops/>

### Adımlar

1. D4'te bir Ek-3 üret.
2. D5'te 4. Ek-3'te kota dolduğunda 402 hatasını tetikle.
3. Sentry dashboard → "Issues" / "Breadcrumbs" sekmeleri.

### Beklenen sonuç

- Sentry'de görünen breadcrumb'lar:
  - `ek3.created`
  - `ek3.generated`
  - `ek3.quota_exceeded` (warning)
- Üretim hatası yoksa Issues boş; breadcrumb'lar trail olarak görünür.

### Smoke test (boş Sentry durumunda manuel throw)

- Geçici olarak bir API route'da `throw new Error('sentry-smoke')` ekleyip deploy et → Sentry'de yeni issue.
- Doğrulayınca commit'i geri al.

---

## D7 — PostHog Event Akışı

**Amaç:** Ürün analitiği canlı.

### Önkoşul

- Vercel env: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (default `https://eu.posthog.com`).
- PostHog project: <https://eu.posthog.com/project/.../events>

### Adımlar

1. Çerez izni dialog'unda "Kabul Et" tıkla (yoksa PostHog opt-in olmaz).
2. D4'ü baştan sona yap (proje → Ek-3 → generate).
3. Yeni proje + revize de yap.
4. PostHog → Events sekmesini yenile.

### Beklenen sonuç

- distinct_id = org_id (KVKK uyumlu pseudonymization).
- Events:
  - `project_created`
  - `ek3_created`
  - `ek3_generated` (props: ek3FormId, version, strategy, templateSource, role)
  - `ek3_revised`
  - `quota_exceeded` (D5'te tetiklenir)
- Identify call'u: orgId distinct, properties.userId + role + plan_code.

---

## Sorun Giderme — Genel

| Belirti             | İlk bakılacak yer                                       |
| ------------------- | ------------------------------------------------------- |
| 500 hatası          | Vercel runtime log (Functions → Logs)                   |
| Mail gitmiyor       | Resend dashboard → Logs / domain DKIM                   |
| Webhook çalışmıyor  | Iyzico/Foriba webhook URL + secret                      |
| PostHog event yok   | Tarayıcıda çerez izni "Kabul Et"; PostHog network panel |
| Sentry event yok    | DSN doğru mu, ENV `production` mu                       |
| Kota 402 yerine 500 | `subscriptions` tablosu boş veya status NULL            |

---

## DoD Tamamlanma Kontrol Listesi

- [ ] D1: Iyzico sandbox 3DS ödeme başarılı (subscriptions.status=active)
- [ ] D2: Foriba sandbox e-fatura kesildi (invoices.e_invoice_status=ok)
- [ ] D3: 5/5 mail provider'ında Resend %100 teslimat (TR karakterler doğru)
- [ ] D4: Uçtan uca PDF üretildi + e-imza yazılımıyla açıldı + imzalanabildi
- [ ] D5: 4. Ek-3 üretmeye çalışınca 402 + Türkçe kota mesajı doğru `used/limit`
- [ ] D6: Sentry breadcrumb'ları görünür (`ek3.*`)
- [ ] D7: PostHog event'leri akıyor (`ek3_created`, `ek3_generated`, vb.)

Hepsi ✓ → Faz 1 DoD complete, design partner onboarding (Hafta 10) yeşil ışık.
