# YapıOps Suite — Doküman İndeksi

> Bu klasör Claude Code için single source of truth'tur.
> Tüm geliştirme bu dokümanlara dayanır. Soruda belirsizlik varsa **uydurmak yerine sor**.

## Okuma sırası

### 1. Master mimari (zorunlu)

[`CLAUDE.md`](./CLAUDE.md) — Tüm sistemin yüksek seviye mimarisi, monorepo yapısı, faz roadmap'i, fiyatlama, riskler.

### 2. Modül spec'leri (geliştirilen modüle göre)

| Modül        | Spec                                                 | Faz           |
| ------------ | ---------------------------------------------------- | ------------- |
| BillingCore  | [`modules/billing.md`](./modules/billing.md)         | 0–1 (paralel) |
| Ek3Pilot     | [`modules/ek3pilot.md`](./modules/ek3pilot.md)       | 1 (MVP)       |
| RaporX       | [`modules/raporx.md`](./modules/raporx.md)           | 2             |
| SpektrumHub  | [`modules/spektrumhub.md`](./modules/spektrumhub.md) | 3             |
| TBDY-Copilot | [`modules/copilot.md`](./modules/copilot.md)         | 3 (beta)      |

### 3. Mimari kararlar (ADR)

| No  | Karar                                   | Bağlantı                                                                   |
| --- | --------------------------------------- | -------------------------------------------------------------------------- |
| 001 | Hibrit mimari (masaüstü bridge + cloud) | [`adr/0001-hibrit-mimari.md`](./adr/0001-hibrit-mimari.md)                 |
| 002 | AI maliyet stratejisi                   | [`adr/0002-ai-maliyet-stratejisi.md`](./adr/0002-ai-maliyet-stratejisi.md) |

### 4. Operasyon (runbook'lar)

- [`runbooks/claude-code-getting-started.md`](./runbooks/claude-code-getting-started.md) — Claude Code'a verilecek prompt'lar ve kontrol listeleri

## Doküman güncelleme prensibi

- **Mimari değişiklik** → Yeni ADR
- **Modül kapsamı değişikliği** → İlgili `modules/*.md` güncellenir, değişiklik notu eklenir
- **Geçmiş sürüm korunur** — git history yeterli; ayrı versioning yok

## Sorumluluk

Bu dokümanlar Bluedev'in iç IP'sidir. Müşteri, ortak veya 3. partilerle paylaşılmaz.
