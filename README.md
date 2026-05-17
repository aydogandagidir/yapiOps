# YapıOps Suite

> Türkiye yapı mühendisliği ofisleri için multi-modül cloud-hibrit SaaS

**Bluedev tarafından geliştirilmektedir.** Mimari ve geliştirme talimatları için: [`docs-internal/CLAUDE.md`](./docs-internal/CLAUDE.md)

## Modüller

| Modül            | Vaat                                | Lansman               |
| ---------------- | ----------------------------------- | --------------------- |
| **Ek3Pilot**     | Yapı Denetim Ek-3 form auto-fill    | Faz 1 (Hafta 12)      |
| **RaporX**       | ETABS OAPI → TBDY 2018 hesap raporu | Faz 2 (Hafta 20)      |
| **SpektrumHub**  | AFAD spektrum + zemin entegrasyonu  | Faz 3 (Hafta 26)      |
| **TBDY-Copilot** | AI destekli TBDY danışmanı          | Faz 3 (Hafta 26 beta) |
| **BillingCore**  | E-fatura + Iyzico abonelik          | Faz 0+1 paralel       |

## Hızlı başlangıç

```bash
# Bağımlılıkları yükle
pnpm install

# .env dosyalarını oluştur
cp .env.example apps/web/.env.local   # değerleri doldur

# Local Supabase başlat (Docker gerekli)
supabase start

# Migration uygula (0001..0004)
pnpm db:migrate

# Generated types
pnpm db:types

# Dev sunucusunu başlat
pnpm dev                  # http://localhost:3000
```

Faz 1 Ek3Pilot için uçtan uca akışı denemek istiyorsanız:
[`docs-internal/runbooks/ek3pilot-sandbox-smoke.md`](./docs-internal/runbooks/ek3pilot-sandbox-smoke.md)

## Komutlar

| Komut                                 | Açıklama                                   |
| ------------------------------------- | ------------------------------------------ |
| `pnpm dev`                            | apps/web Next.js dev sunucusu (Turbopack)  |
| `pnpm build`                          | Tüm paketleri Turbo ile build eder         |
| `pnpm type-check`                     | Tüm workspace TS tip kontrolü              |
| `pnpm lint`                           | ESLint + Prettier check                    |
| `pnpm test`                           | Vitest birim testler (paketler + apps/web) |
| `pnpm test:tbdy`                      | Sadece TBDY hesaplama testleri (kritik)    |
| `pnpm --filter @yapiops/web test:e2e` | Playwright e2e                             |
| `pnpm db:migrate`                     | Supabase migration                         |
| `pnpm db:reset`                       | Veritabanını sıfırla + migration           |
| `pnpm db:types`                       | TypeScript tipleri yeniden üret            |
| `pnpm format`                         | Prettier format                            |

## Yapı

```
yapiops/
├── apps/
│   ├── web/                 # Next.js 15 ana uygulama
│   ├── desktop-bridge/      # .NET 8 ETABS köprüsü
│   └── docs/                # Docusaurus kullanıcı dokümanı
├── packages/
│   ├── @yapiops/db/         # Supabase schema + tipler
│   ├── @yapiops/auth/       # Supabase JWT + RBAC + RLS guard'ları
│   ├── @yapiops/ui/         # shadcn/ui + özel komponentler
│   ├── @yapiops/tbdy/       # TBDY 2018 hesaplama kütüphanesi
│   ├── @yapiops/etabs/      # ETABS veri modelleri
│   ├── @yapiops/ek3/        # Ek-3 form domain (types, Zod, validators, ETABS map, template-source)
│   ├── @yapiops/pdf/        # pdf-lib AcroForm fill + HTML fallback (Faz 1) → Puppeteer (Faz 2)
│   ├── @yapiops/ai/         # Claude API + RAG
│   ├── @yapiops/billing/    # Iyzico + e-fatura + plan/quota
│   ├── @yapiops/audit/      # Audit log
│   └── @yapiops/config/     # Ortak config (ESLint/Prettier/Tailwind/TS)
├── infrastructure/
│   ├── supabase/
│   └── github-actions/
└── docs-internal/           # İç dokümanlar (Claude Code için)
    ├── CLAUDE.md            # Master mimari
    ├── modules/             # Modül-spesifik specler
    ├── adr/                 # Architecture Decision Records
    └── runbooks/
```

## Mevcut durum (Hafta 7 sonu)

- **Faz 0** (Foundation, Hafta 1–4): ✅ Code complete — monorepo, CI/CD, Supabase + RLS, auth flow, BillingCore (Iyzico + Foriba), audit, observability.
- **Faz 1 Hafta 5–7** (Ek3Pilot web tarafı): ✅ `@yapiops/ek3` paketi, 9 API rotası, 6-step sihirbaz UI, resmi şablon canlı sync + manuel upload, proje CRUD.
- **Faz 1 Hafta 8–9** (Desktop Bridge POC): 🟡 Plan hazır ([~/.claude/plans/faz-1-hafta-8-9-bridge-poc.md](~/.claude/plans/faz-1-hafta-8-9-bridge-poc.md)).
- **Faz 1 Hafta 10–12**: ⏳ Beta + marketing + lansman.
- **Faz 2 RaporX, Faz 3 SpektrumHub & Copilot**: ⏳ Roadmap'te.

## Önemli runbook'lar

- [`docs-internal/runbooks/ek3pilot-sandbox-smoke.md`](./docs-internal/runbooks/ek3pilot-sandbox-smoke.md) — Yerel ortamda Ek3Pilot uçtan uca doğrulama.
- [`docs-internal/runbooks/claude-code-getting-started.md`](./docs-internal/runbooks/claude-code-getting-started.md) — Claude Code prompt rehberi.

## Env değişkenleri

Tam liste: [`.env.example`](./.env.example). Faz 1 için kritikler:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` (sandbox: `https://sandbox-api.iyzipay.com`)
- `FORIBA_*` (e-fatura)
- `CRON_SECRET` (Vercel Cron, Ek-3 şablon sync)
- `EK3_TEMPLATE_OFFICIAL_URLS` (opsiyonel; default Bakanlık + Resmî Gazete URL'leri kullanılır)
- `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`

## Geliştirme

Bu repo Claude Code ile sıfırdan inşa edilmek üzere tasarlanmıştır. Başlamak için:

1. [`docs-internal/CLAUDE.md`](./docs-internal/CLAUDE.md) — master mimari, faz roadmap'i
2. İlgili modül dosyası ([`docs-internal/modules/`](./docs-internal/modules/))
3. Claude Code'a şu prompt'la başlayın:

```
docs-internal/CLAUDE.md ve modules/ klasöründeki tüm dosyaları oku.
Faz 0'dan başla. Her dosya oluşturduğunda CLAUDE.md'deki yapıya birebir uy.
İlerlemeyi checklist üzerinden raporla.
```

## Lisans

Tescilli — Bluedev (Blue Robot Teknolojileri ve Ticaret Ltd. Şti.)
