# Modül: TBDY-Copilot

> **Lansman:** Faz 3 (Hafta 21–26, beta) → Faz 4 (Hafta 27–34, GA)
> **Öncelik:** P1 (kategorik fark)
> **Bağımlılık:** RaporX (proje bağlamı), Claude API, pgvector

## 1. Vaat

TBDY 2018'i bilen, projenize özel cevap veren AI mühendis asistanı. Hiçbir Türk yapı yazılımında benzeri yok — bu bizim **nesil farkı** modülümüz.

## 2. Kullanıcı senaryoları

### S1: TBDY madde sorgu
> Mühendis: "Perde uç bölgesindeki sargı donatısı için minimum hangi koşullar sağlanmalı?"
>
> Copilot: "TBDY 2018 Madde 7.6.5'e göre... [madde özeti] ... Sizin projenizde Perde-3 için minimum sargı sıklığı şöyle olmalı: ..."

### S2: Hata yorumu
> RaporX raporunda "Perde-5 kesme kontrolü FAIL" gözükür
>
> Copilot otomatik açıklar: "Perde-5'te kesme kuvveti 1850 kN, kapasitesi 1400 kN. Madde 7.6.7'ye göre... Düzeltme önerisi: (a) perde kalınlığını 30→35 cm, (b) yatay donatı çapını φ12→φ14 vb."

### S3: Peer-review checklist
> Mühendis "Peer-review başlat" tıklar
>
> Copilot tüm modeli tarar, 30+ kontrol noktası listeler:
> - [ ] Tüm perdelerde uç bölge sargı donatısı yeterli mi?
> - [ ] Burulma düzensizliği var mı?
> - [ ] Yumuşak kat var mı?
> - ... her birine cevabı projeyle birlikte verir

### S4: Rapor anlatı bölümü
> Mühendis: "Bu projenin yönetici özeti bölümünü yaz"
>
> Copilot 1 sayfa Türkçe profesyonel mühendislik dilinde özet üretir.

## 3. Mimari

```
┌─────────────────────────────────────────────────┐
│  Kullanıcı sorgusu + bağlam (proje, rapor)      │
└────────────────────┬────────────────────────────┘
                     ▼
        ┌────────────────────────┐
        │  Query enrichment      │  Haiku 4.5 (cache)
        │  → arama anahtarları   │  ~50ms
        └──────────┬─────────────┘
                   ▼
        ┌────────────────────────┐
        │  Hybrid search         │
        │  - pgvector (semantik) │
        │  - PostgreSQL FTS      │
        │  - Re-rank             │
        │  → top 8 chunk         │
        └──────────┬─────────────┘
                   ▼
        ┌────────────────────────┐
        │  Proje bağlam yutma    │
        │  - İlgili eleman       │
        │  - Hesap sonuçları     │
        │  - Önceki sorgular     │
        └──────────┬─────────────┘
                   ▼
        ┌────────────────────────┐
        │  Opus 4.7 cevap        │  cache hit ~3s
        │  + cache (sistem prompt│  cold ~10s
        │    + TBDY chunks)      │
        └──────────┬─────────────┘
                   ▼
        ┌────────────────────────┐
        │  Streaming → UI        │
        │  + audit log           │
        │  + cost tracking       │
        └────────────────────────┘
```

## 4. Bilgi tabanı (RAG)

### 4.1 Kapsam

**Faz 3 (lansman):**
- TBDY 2018 (tüm bölümler, ~250 sayfa)
- TS 500 — Betonarme Yapıların Tasarım ve Yapım Kuralları (~150 sayfa)

**Faz 4:**
- Yapı Denetim Yönetmeliği
- ÇYTHYE 2016 (Çelik Yapıların Tasarım, Hesap ve Yapım Esasları)
- ZSY (Zemin Sondajları ve Sondaj Yöntemleri Yönetmeliği)
- TS 498 (yükler)

### 4.2 Chunking stratejisi

TBDY hiyerarşik bir doküman; chunking bölüm-madde sınırlarına saygı göstermeli.

```typescript
// scripts/ingest-tbdy.ts

interface TbdyChunk {
  source: 'TBDY 2018' | 'TS 500' | string;
  bolum: string;       // "7"
  altbolum?: string;   // "7.6"
  madde: string;       // "7.6.7" — bu chunk'ın bağlandığı madde
  baslik: string;
  icerik: string;      // 200–500 kelime hedef
  metadata: {
    sayfaNo: number;
    tablo?: string;    // "Tablo 4.34a" gibi
    formul?: string;   // "Eq. 7.15" gibi
    ilgiliMaddeler: string[];  // Cross-reference
  };
}

// Strateji:
// 1. PDF metnini madde başlığına göre böl
// 2. Çok uzunsa (>700 kelime) alt-paragraflara böl, ama madde meta'sını koru
// 3. Tablo ve formülleri ayrı chunk olarak da indeksle (ek arama için)
// 4. Embedding'i baslik + icerik kombinasyonu üzerinden al
```

### 4.3 Embedding seçimi

**Karar:** OpenAI `text-embedding-3-large` (3072 boyut).

Sebep:
- Anthropic embedding modeli sunmuyor
- Türkçe'de güçlü performans
- Maliyet: $0.13/1M token — TBDY tüm corpus tek seferlik ~$5
- pgvector ile uyumlu

**Alternatif:** Voyage AI `voyage-3` (Anthropic önerir) — multilingual güçlü, fiyat benzer. Faz 3 öncesi A/B test.

### 4.4 Hybrid search

```sql
-- packages/@yapiops/ai/src/rag/search.sql

WITH semantic_results AS (
  SELECT id, content, metadata,
         1 - (embedding <=> $1) AS similarity
  FROM tbdy_chunks
  ORDER BY embedding <=> $1
  LIMIT 20
),
fts_results AS (
  SELECT id, content, metadata,
         ts_rank(to_tsvector('turkish', content), query) AS rank
  FROM tbdy_chunks,
       plainto_tsquery('turkish', $2) query
  WHERE to_tsvector('turkish', content) @@ query
  ORDER BY rank DESC
  LIMIT 20
)
-- Reciprocal Rank Fusion (RRF)
SELECT id, content, metadata,
       COALESCE(1.0 / (60 + sr.rank_pos), 0) +
       COALESCE(1.0 / (60 + fr.rank_pos), 0) AS rrf_score
FROM ...
ORDER BY rrf_score DESC
LIMIT 8;
```

## 5. Prompt mühendisliği

### 5.1 Sistem prompt yapısı

```typescript
const TBDY_COPILOT_SYSTEM = `
Sen TBDY 2018 (Türkiye Bina Deprem Yönetmeliği), TS 500 ve ilgili yapı
mühendisliği yönetmelikleri konusunda uzman bir asistansın.

GÖREVIN: Kullanıcının sorduğu konuyu, sağlanan TBDY referansları ve proje
bağlamı ışığında, profesyonel mühendislik dilinde Türkçe yanıtlamak.

KURALLAR:
1. Madde numarasını ve formülü mutlaka belirt: "TBDY 2018 Madde 7.6.7'ye göre..."
2. Hesaplama gösterirken birim sistemine dikkat et (kullanıcının modelindeki birim)
3. Belirsizlik varsa açıkça söyle: "Bu nokta için ek doğrulama gerekir"
4. ASLA "merhaba", "tabii ki yardımcı olurum" gibi gereksiz dolgu kullanma
5. Cevabını yapısal olarak organize et: özet → ilgili madde → projeye uygulama
6. Sonunda "Mühendis sorumluluğu: Bu yorum danışma amaçlıdır, nihai karar
   ruhsat sorumlusu mühendise aittir." şeklinde sorumluluk reddi ekle

YAPMAYACAKLARIN:
- Hayal edilmiş madde numarası VERME (RAG sonuçları dışında madde alıntılama)
- Mühendislik kararı verme (öneri verirsin, karar mühendisin)
- Türkçe dışı dilde cevap verme (kullanıcı talep etmedikçe)
`;
```

### 5.2 Bağlam katmanları

```typescript
async function buildPrompt(query: string, context: ProjectContext) {
  return [
    // 1. Sistem prompt (CACHED — sabit)
    {
      type: 'text',
      text: TBDY_COPILOT_SYSTEM,
      cache_control: { type: 'ephemeral' }
    },

    // 2. RAG sonuçları (CACHED — oturum başına)
    {
      type: 'text',
      text: `İlgili TBDY/TS500 referansları:\n\n${ragResults.map(formatChunk).join('\n---\n')}`,
      cache_control: { type: 'ephemeral' }
    },

    // 3. Proje bağlamı (CACHED — proje başına)
    {
      type: 'text',
      text: `Proje bağlamı:\n${formatProjectContext(context)}`,
      cache_control: { type: 'ephemeral' }
    },

    // 4. Soru (cache'siz)
    {
      type: 'text',
      text: `Soru: ${query}`
    }
  ];
}
```

**Cache hit beklentisi:**
- Aynı projeyle 5 dakika içinde gelen sonraki sorgular: ~%90 maliyet düşüşü
- Sistem prompt: kalıcı cache (her sorguda)
- RAG sonuçları: 3 sorgu içinde benzer chunk'lar tekrar gelirse cache hit

## 6. Maliyet kontrolü

### 6.1 Bütçe sınırları

Plan başına aylık AI sorgu sınırı:

| Plan | Sorgu/ay | Tahmini ham maliyet | Marj |
|---|---|---|---|
| Solo | 0 | $0 | — |
| Office | 0 | $0 | — (Copilot dahil değil) |
| Office+AI | 200 | ~$10–15 | %70 |
| Enterprise | Sınırsız (fair use) | Değişken | ≥%50 |

Top-up: 100 sorgu = ₺500.

### 6.2 Akıllı routing

```typescript
function selectModel(query: string, context: Context): ModelChoice {
  // Basit sınıflandırma sorularında Haiku
  if (isClassification(query) || isShortFactual(query)) {
    return { model: 'claude-haiku-4-5-20251001', reason: 'simple' };
  }

  // Hesaplama/yorum/analiz → Opus
  return { model: 'claude-opus-4-7', reason: 'complex' };
}
```

**Hedef:** %30 sorgu Haiku'ya yönlensin (10× daha ucuz). Bu, ortalama maliyeti %30 düşürür.

## 7. Veri modeli

```sql
CREATE TABLE ai_queries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  query TEXT NOT NULL,
  context JSONB,
  rag_chunks UUID[],              -- Kullanılan chunk ID'leri
  response TEXT,
  model_used TEXT,
  tokens_input INT,
  tokens_output INT,
  cache_hit BOOLEAN,
  cost_usd NUMERIC(10,6),
  latency_ms INT,
  user_feedback INT,              -- -1, 0, 1 (thumbs)
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_queries_user ON ai_queries(user_id, created_at DESC);
CREATE INDEX idx_ai_queries_cost ON ai_queries(org_id, created_at) WHERE cost_usd > 0;

CREATE TABLE tbdy_chunks (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  bolum TEXT,
  altbolum TEXT,
  madde TEXT,
  baslik TEXT,
  icerik TEXT NOT NULL,
  embedding vector(3072),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tbdy_embedding ON tbdy_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_tbdy_fts ON tbdy_chunks
  USING gin(to_tsvector('turkish', icerik));
```

## 8. UI

### 8.1 Sayfalar

```
apps/web/app/(dashboard)/copilot/
├── page.tsx                # Ana sohbet arayüzü
├── history/                # Sorgu geçmişi
└── _components/
    ├── ChatInterface.tsx
    ├── MessageBubble.tsx
    ├── CitationCard.tsx    # TBDY madde kartı
    ├── ProjectContextPicker.tsx
    └── FeedbackButton.tsx
```

### 8.2 Inline Copilot (RaporX entegrasyonu)

RaporX raporunda her ihlal yanında küçük "🤖 Açıkla" butonu — tıklayınca Copilot inline cevap verir.

## 9. Kalite metriği

### 9.1 Otomatik

- **Citation accuracy:** Her cevapta en az 1 TBDY madde alıntısı; alıntılanan maddeler RAG sonuçlarında olmalı (hayal madde tespit)
- **Response latency:** p50 < 5sn, p95 < 15sn
- **Cache hit rate:** Hedef >%50

### 9.2 Manuel (haftalık)

- 20 random sorgu örneklemi → mühendislik geri bildirimi
- "Yararlı / yanlış / yarı yanlış" sınıflandırması
- Hedef: %80+ "yararlı"

## 10. Güvenlik

### 10.1 Prompt injection

Kullanıcı girdisi sistem prompt'a karışmaz; her zaman ayrı message bloğunda.

```typescript
// YANLIŞ:
const prompt = `Sistem: ... Soru: ${userInput}`;

// DOĞRU:
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: userInput }  // Anthropic API yapısı
];
```

### 10.2 Veri sızıntısı

- AI sorgu/cevapları organizasyon sınırını aşmaz (RLS ile garanti)
- Audit log her sorguyu kaydeder
- Anthropic API "no training" mode aktif

### 10.3 Sorumluluk reddi

Her cevabın sonunda otomatik:
> "Bu yorum danışma amaçlıdır. Mühendislik kararı ve ruhsat sorumluluğu projeyi imzalayan mühendise aittir. TBDY 2018 ve ilgili yönetmeliklerin güncel versiyonu için resmi kaynaklara başvurunuz."

## 11. Lansman kriterleri (DoD — Beta)

- [ ] TBDY 2018 + TS 500 chunking ve embedding tamamlandı
- [ ] 50 referans soru (mühendislik test seti) hazır, doğru cevap işaretli
- [ ] Test setinde ≥%75 doğruluk
- [ ] Hayal madde (hallucinated citation) tespiti aktif, %0 tolerans
- [ ] Inline Copilot RaporX raporlarında çalışıyor
- [ ] 5 beta mühendis 1 hafta kullandı, ≥%70 olumlu geri bildirim
- [ ] Cost dashboard çalışıyor, sınır aşımında otomatik throttle
- [ ] Audit log her sorguda doğru veri tutuyor
