# Environment Variables — Reference

YapıOps Vercel deploy'unda kullanılan tüm env değişkenleri. **Boş bırakılan
opsiyonel değişkenler ilgili özelliği sessizce kapatır** (kod no-op fallback
ile yazıldı, runtime hatası vermez).

Vercel UI: <https://vercel.com/adagidir/yapi-ops-web/settings/environment-variables>

---

## Required at Startup (build/runtime kritik)

| Var                             | Nerede okunur                    | Açıklama                                           |
| ------------------------------- | -------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `@yapiops/db/{client,server}.ts` | Supabase project URL — `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | aynı                             | Anon key (browser/edge erişim)                     |

**Bunlar olmadan app build hata verir / runtime'da Supabase Error fırlatır.**

---

## Required at Runtime (sadece ilgili route çalışırken)

| Var                                                                                              | Route                                                   | Boşken davranış                                        |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY`                                                                      | `createSupabaseServiceClient()` — webhooks, cron, admin | Service-role gerektiren işlemler 500                   |
| `IYZICO_WEBHOOK_SECRET`                                                                          | `POST /api/webhooks/iyzico`                             | Webhook 500; abonelik durumu güncellenmez              |
| `IYZICO_API_KEY` / `IYZICO_SECRET_KEY`                                                           | `@yapiops/billing/checkout`                             | Checkout endpoint 500                                  |
| `CRON_SECRET`                                                                                    | `GET /api/cron/ek3-template-sync`                       | Cron 500; günlük şablon sync olmaz                     |
| `RESEND_API_KEY` (opsiyonel, Supabase SMTP üzerinden gönderim için Supabase Dashboard'da ayarlı) | `@yapiops/notifications`                                | Bildirimler için Supabase Auth zaten Resend kullanıyor |

---

## Optional — Telemetri (no-op fallback ✅)

| Var                                                          | Default                  | Etki                                                                              |
| ------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------- |
| `SENTRY_DSN` (server) veya `NEXT_PUBLIC_SENTRY_DSN` (client) | —                        | Yoksa Sentry init atlanır; tüm `Sentry.*` çağrıları SDK düzeyinde sessizce no-op. |
| `NEXT_PUBLIC_POSTHOG_KEY`                                    | —                        | Yoksa `initPostHog()` null döner; tüm capture çağrıları no-op.                    |
| `NEXT_PUBLIC_POSTHOG_HOST`                                   | `https://eu.posthog.com` | EU bölgesi varsayılan (KVKK uyumlu).                                              |
| `NEXT_PUBLIC_VERCEL_ENV` / `VERCEL_ENV`                      | —                        | Sentry environment etiketleme için; Vercel otomatik set eder.                     |

**Verdict:** Bu env'ler olmadan da app sorunsuz çalışır. Sadece observability
sinyal akmaz. Kod gözden geçirildi — runtime hatası riski yok.

---

## Optional — Diğer

| Var                   | Default               | Etki                           |
| --------------------- | --------------------- | ------------------------------ |
| `NEXT_PUBLIC_APP_URL` | `https://yapiops.com` | E-posta linkleri için base URL |
| `SYSTEM_ORG_ID`       | sentinel UUID         | Cron iş için sistem org ID     |

---

## Production'da Şu An Tanımlı Olması Gerekenler

Aşağıdakiler **mutlaka** Vercel Production env'inde var olmalı:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_WEBHOOK_SECRET
✅ CRON_SECRET
```

Sprint C için **eklenmesi gereken** (opsiyonel ama önerilen):

```
🟡 SENTRY_DSN
🟡 NEXT_PUBLIC_POSTHOG_KEY
🟡 NEXT_PUBLIC_POSTHOG_HOST  (default eu.posthog.com)
```

---

## Vercel'de Env Eklemek

1. <https://vercel.com/adagidir/yapi-ops-web/settings/environment-variables>
2. **Add new** → key + value yapıştır → environments seç (Production, Preview).
3. Save → otomatik redeploy başlamaz; manual "Redeploy" → next request'ten itibaren aktif.

`NEXT_PUBLIC_*` ile başlayan değişkenler client bundle'a dahil edilir (public).
Diğerleri server-only.
