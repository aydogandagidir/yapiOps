# YapıOps Suite

> Türkiye yapı mühendisliği ofisleri için multi-modül cloud-hibrit SaaS

**Bluedev tarafından geliştirilmektedir.** Mimari ve geliştirme talimatları için: [`docs-internal/CLAUDE.md`](./docs-internal/CLAUDE.md)

## Modüller

| Modül | Vaat | Lansman |
|---|---|---|
| **Ek3Pilot** | Yapı Denetim Ek-3 form auto-fill | Faz 1 (Hafta 12) |
| **RaporX** | ETABS OAPI → TBDY 2018 hesap raporu | Faz 2 (Hafta 20) |
| **SpektrumHub** | AFAD spektrum + zemin entegrasyonu | Faz 3 (Hafta 26) |
| **TBDY-Copilot** | AI destekli TBDY danışmanı | Faz 3 (Hafta 26 beta) |
| **BillingCore** | E-fatura + Iyzico abonelik | Faz 0+1 paralel |

## Hızlı başlangıç

```bash
# Bağımlılıkları yükle
pnpm install

# Local Supabase başlat
pnpm supabase start

# Migration uygula
pnpm db:migrate

# Tip oluştur
pnpm db:types

# Dev ortamını başlat (web + bridge)
pnpm dev
```

## Yapı

```
yapiops/
├── apps/
│   ├── web/                 # Next.js 15 ana uygulama
│   ├── desktop-bridge/      # .NET 8 ETABS köprüsü
│   └── docs/                # Docusaurus kullanıcı dokümanı
├── packages/
│   ├── @yapiops/db/         # Supabase schema + tipler
│   ├── @yapiops/auth/
│   ├── @yapiops/ui/         # shadcn/ui + özel komponentler
│   ├── @yapiops/tbdy/       # TBDY 2018 hesaplama kütüphanesi
│   ├── @yapiops/etabs/      # ETABS veri modelleri
│   ├── @yapiops/pdf/        # PDF üretim
│   ├── @yapiops/ai/         # Claude API + RAG
│   ├── @yapiops/billing/    # Iyzico + e-fatura
│   ├── @yapiops/audit/      # Audit log
│   └── @yapiops/config/     # Ortak config
├── infrastructure/
│   ├── supabase/
│   └── github-actions/
└── docs-internal/           # İç dokümanlar (Claude Code için)
    ├── CLAUDE.md            # Master mimari
    ├── modules/             # Modül-spesifik specler
    ├── adr/                 # Architecture Decision Records
    └── runbooks/
```

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
