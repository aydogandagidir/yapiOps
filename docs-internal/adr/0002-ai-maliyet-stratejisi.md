# ADR-002: AI Maliyet Stratejisi

**Durum:** Kabul edildi
**Tarih:** 2026-05-06

## Bağlam

TBDY-Copilot modülü Claude API üzerinden çalışacak. Ham maliyet hesabı yapılmadan plan fiyatlaması ve sınırlar belirlenemez. AI maliyetinin ARR'nin %5–8'inde tutulması hedef.

## Karar

3 katmanlı maliyet kontrolü:

### 1. Model routing (Haiku ön-filtre)

```
Sorgu sınıflandırıcı (Haiku 4.5, ucuz):
├── Basit/factual (%30 sorgu) → Haiku 4.5 cevap verir
└── Karmaşık/akıl yürütme (%70) → Opus 4.7'ye yönlendir
```

Hedef: Ortalama maliyet %25–30 düşer.

### 2. Prompt caching (Anthropic native)

```
Sistem prompt (~3K token) → CACHED (her sorguda)
TBDY chunks (~20K token) → CACHED (oturum başına)
Proje bağlamı (~5K token) → CACHED (proje başına 5 dk)
```

GümrükAI'da kanıtlanmış pattern: %70+ maliyet düşüşü.

### 3. Plan başına aylık sınır

| Plan | Sorgu/ay | Tahmini maliyet | Marj |
|---|---|---|---|
| Office+AI | 200 | $10–15 | %70+ |
| Enterprise | Sınırsız (fair use) | Değişken | %50+ |

Limit aşımında: top-up ($5/100 sorgu) veya plan upgrade.

### 4. Hard cap (kötü niyetli kullanıma karşı)

- Org başına saatlik max 50 sorgu (Upstash Redis rate limit)
- User başına dakikada max 5 sorgu
- Aşılırsa graceful 429 + "Yavaş ol biraz" mesajı

## Tahmini hesap (Office+AI plan, ₺3.500/ay = ~$110/ay)

```
200 sorgu/ay × ortalama maliyet:
- %30 Haiku: 60 × $0.005 = $0.30
- %70 Opus (cache hit %60): 140 × $0.04 = $5.60
- Toplam: ~$6/ay AI maliyeti

Plan geliri: $110/ay (KDV ve Iyzico komisyonu sonrası net ~$80)
AI maliyeti: $6
Marj: %92
```

Bu sağlıklı. Plana ek operasyonel maliyet (Vercel, Supabase, Iyzico komisyon) %15 civarı; toplam marj %75+.

## Alternatif değerlendirmeler

### A1: Self-hosted Ollama (Llama 3.1 70B)
Reddedildi — Türkçe yapı mühendisliği terminolojisinde Claude'dan zayıf, GPU maliyeti yüksek (~$500/ay sabit), kalite risk yüksek.

### A2: GPT-4 / Gemini
Reddedildi — Bluedev'in mevcut Anthropic ekosistemine yatırımı, prompt caching avantajı kaybolur.

### A3: Sınırsız sorgu, kullanıma göre faturalama
Reddedildi — Türk müşteri psikolojisi sabit fiyatı tercih eder. "Sürpriz fatura" riskinden kaçınma.

## İzleme

`ai_queries` tablosunda her sorgunun `tokens_input`, `tokens_output`, `cache_read_tokens`, `cost_usd` kayıtlanır. Org bazlı aylık dashboard:

- Toplam sorgu, ortalama latency
- Cache hit rate (hedef ≥%50)
- Maliyet/sorgu (hedef <$0.05)
- Bütçe alarmı (%80 kullanım → email)

## Referanslar

- [modules/copilot.md Bölüm 6](../modules/copilot.md)
- Anthropic Prompt Caching Documentation
