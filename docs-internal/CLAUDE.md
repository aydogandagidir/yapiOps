# Bluedev YapıOps Suite — Master Architecture Document

> **Belge versiyonu:** v1.0.0
> **Hedef:** Türkiye yapı mühendisliği ofisleri için multi-modül cloud-hibrit SaaS
> **Lansman hedefi:** 24 ay içinde ₺6–12 M ARR
> **Bu doküman ne içindir:** Claude Code'un tüm projeyi sıfırdan inşa edebilmesi için tek kaynak doğruluk (single source of truth)

---

## 1. ÜRÜN VİZYONU VE STRATEJİK KONUM

### 1.1 Tek cümle vaat

> "Türk yapı mühendisliği ofislerinin TBDY 2018 hesap raporu, Yapı Denetim Ek-3, AFAD spektrumu ve denetim akışlarını tek bir cloud-hibrit SaaS'ta birleştiren, AI-destekli, e-fatura entegre, ofis lisansıyla ölçeklenen iş-akışı katmanı."

### 1.2 Rakipler ve farklılaştırma

| Rakip                             | Tip                      | Bizim farkımız                                              |
| --------------------------------- | ------------------------ | ----------------------------------------------------------- |
| **Etex (Rufai Demir)**            | Tek-modül masaüstü       | Çok-modül cloud-hibrit + AI + Ek-3 + multi-source rapor     |
| **ProtaStructure / ideCAD**       | Tam paket statik yazılım | Eklenti değil, iş-akışı katmanı; mevcut yazılımları tüketen |
| **Sadık Özbaba SPA**              | Çelik birleşim hesabı    | Farklı segment; çakışma yok                                 |
| **Mühendis Akademi / FK Akademi** | Eğitim                   | Partner adayı, rakip değil                                  |

**Üç sözcüklük farkımız:** **Çok-modül, AI-destekli, self-serve.**

### 1.3 5 Modül

1. **Ek3Pilot** — Yapı Denetim Ek-3 form auto-fill (MVP, 0–3 ay)
2. **RaporX** — ETABS OAPI → TBDY 2018 rapor üreteci (3–6 ay)
3. **SpektrumHub** — AFAD spektrum + zemin entegrasyonu (5–8 ay)
4. **TBDY-Copilot** — AI/LLM TBDY danışmanı (7–10 ay)
5. **BillingCore** — E-fatura + Iyzico abonelik altyapısı (paralel, 0–4 ay)

---

## 2. SİSTEM MİMARİSİ

### 2.1 Yüksek seviye topoloji

```
┌─────────────────────────────────────────────────────────────────┐
│                    KULLANICI KATMANI                             │
├──────────────────────────┬──────────────────────────────────────┤
│  Web App (Next.js 15)    │  Desktop Bridge (.NET 8 + WPF)       │
│  - Ek3Pilot UI           │  - ETABS OAPI köprüsü                │
│  - RaporX UI             │  - Lokal model okuma                 │
│  - SpektrumHub UI        │  - JSON metadata cloud'a iletim      │
│  - TBDY-Copilot UI       │  - Otomatik güncelleme               │
│  - Admin / Billing       │  - Cloud auth check                  │
└────────────┬─────────────┴────────────┬─────────────────────────┘
             │ HTTPS / WSS              │ HTTPS (mTLS)
             ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Next.js API Routes)              │
│  - Auth middleware (Supabase JWT)                                │
│  - Rate limiting (Upstash Redis)                                 │
│  - Request logging → Audit Service                               │
└────────────┬────────────────────────────────────────────────────┘
             │
   ┌─────────┼─────────┬──────────┬──────────┬──────────┐
   ▼         ▼         ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌─────────┐ ┌──────┐ ┌────────┐ ┌─────────┐
│ Ek3  │ │Rapor │ │Spektrum │ │TBDY  │ │Billing │ │ Audit   │
│Pilot │ │  X   │ │  Hub    │ │Copilot│ │ Core  │ │ Service │
│ Svc  │ │ Svc  │ │  Svc    │ │ Svc   │ │  Svc  │ │         │
└───┬──┘ └──┬───┘ └────┬────┘ └──┬───┘ └────┬───┘ └────┬────┘
    │       │          │         │          │          │
    └───────┴──────────┴─────────┴──────────┴──────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌───────────────┐ ┌───────────┐ ┌──────────────┐
    │   Supabase    │ │  Claude   │ │   External   │
    │  - Postgres   │ │   API     │ │   APIs       │
    │  - Auth       │ │ (Opus 4.7,│ │ - AFAD       │
    │  - Storage    │ │  Haiku    │ │ - Iyzico     │
    │  - pgvector   │ │   4.5)    │ │ - Foriba     │
    │  - Realtime   │ │ + Managed │ │ - GİB        │
    │               │ │  Agents   │ │              │
    └───────────────┘ └───────────┘ └──────────────┘
```

### 2.2 Mimari prensipler

1. **Hibrit, cloud-first** — ETABS köprüsü hariç tüm iş cloud'da. Masaüstü ince istemci (50–80 MB), 6 ayda bir güncel kalmasa bile çalışır.
2. **Modüler monorepo** — Tek repo, paylaşılan paketler, bağımsız deploy edilebilir uygulamalar. Turborepo ile build cache.
3. **Stateless API** — Tüm state Supabase'de. Vercel serverless function'lar instance bağımsız.
4. **Multi-tenancy** — Row Level Security (RLS) ile organization-bazlı izolasyon. Her sorgu `org_id` ile filtrelenir.
5. **Audit-first** — Her yazma işlemi audit log'a düşer. KVKK ve mühendislik sorumluluğu için kritik.
6. **Türkçe-öncelikli, EN-hazır** — i18n altyapısı baştan kurulur, ama lansman TR.
7. **Cost-conscious AI** — Prompt caching (GümrükAI'da %70+ tasarruf), Haiku 4.5 ön-filtreleme, Opus 4.7 sadece karmaşık akıl yürütmede.

---

## 3. MONOREPO YAPISI

```
yapiops/
├── apps/
│   ├── web/                    # Next.js 15 ana web uygulaması
│   │   ├── app/
│   │   │   ├── (auth)/         # Giriş, kayıt
│   │   │   ├── (dashboard)/    # Modül başına route
│   │   │   │   ├── ek3pilot/
│   │   │   │   ├── raporx/
│   │   │   │   ├── spektrumhub/
│   │   │   │   ├── copilot/
│   │   │   │   └── billing/
│   │   │   ├── (marketing)/    # Landing, fiyat, blog
│   │   │   └── api/            # API route'ları
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   │
│   ├── desktop-bridge/         # .NET 8 WPF ETABS köprüsü
│   │   ├── src/
│   │   │   ├── EtabsConnector/ # OAPI wrapper
│   │   │   ├── Auth/           # Cloud token yönetimi
│   │   │   ├── Sync/           # Cloud'a veri iletimi
│   │   │   └── UI/             # WPF arayüz
│   │   ├── installer/          # WiX MSI builder
│   │   └── tests/
│   │
│   └── docs/                   # Docusaurus kullanıcı dokümanı
│
├── packages/
│   ├── @yapiops/db/            # Supabase schema, migrations, type'lar
│   │   ├── migrations/
│   │   ├── seed/
│   │   └── types.ts            # Auto-generated
│   │
│   ├── @yapiops/auth/          # Auth helper, RLS yardımcıları
│   ├── @yapiops/ui/            # shadcn/ui + özel komponentler
│   ├── @yapiops/tbdy/          # TBDY 2018 hesaplama kütüphanesi
│   │   ├── src/
│   │   │   ├── perde/          # Perde kontrolleri
│   │   │   ├── kolon/
│   │   │   ├── doseme/
│   │   │   ├── otleme/         # Göreli kat ötelemesi
│   │   │   ├── ikinci-mertebe/
│   │   │   └── spektrum/       # Spektrum üretici
│   │   └── tests/              # Mühendislik test vakaları
│   │
│   ├── @yapiops/etabs/         # ETABS veri modelleri (TS), parser
│   ├── @yapiops/pdf/           # PDF üretim (pdf-lib + Puppeteer)
│   ├── @yapiops/ai/            # Claude API wrapper, prompt caching
│   ├── @yapiops/billing/       # Iyzico, e-fatura helper'ları
│   ├── @yapiops/audit/         # Audit log yazma/okuma
│   └── @yapiops/config/        # ESLint, Prettier, TS, Tailwind config
│
├── infrastructure/
│   ├── supabase/               # Local dev için Supabase config
│   ├── docker-compose.dev.yml  # Local dev ortamı
│   └── github-actions/         # CI/CD workflow'ları
│
├── docs-internal/              # İç doküman (bu dosya dahil)
│   ├── CLAUDE.md               # Bu dosya
│   ├── modules/
│   │   ├── ek3pilot.md
│   │   ├── raporx.md
│   │   ├── spektrumhub.md
│   │   ├── copilot.md
│   │   └── billing.md
│   ├── adr/                    # Architecture Decision Records
│   └── runbooks/               # Operasyon prosedürleri
│
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 4. TEKNOLOJİ YIĞINI

### 4.1 Frontend (Web)

| Katman    | Teknoloji                    | Sebep                                   |
| --------- | ---------------------------- | --------------------------------------- |
| Framework | Next.js 15 (App Router)      | Bluedev mevcut pattern, RSC + streaming |
| UI Kit    | shadcn/ui + Tailwind CSS 4   | Mevcut Bluedev standardı                |
| State     | Zustand + TanStack Query     | Hafif + server state ayrımı             |
| Form      | react-hook-form + Zod        | Tip güvenliği                           |
| Tablo     | TanStack Table               | Rapor görüntüleme                       |
| 3D Viewer | Three.js + react-three-fiber | RaporX'te ETABS modeli görselleştirme   |
| Grafik    | Recharts                     | Ötleme/spektrum grafikleri              |
| i18n      | next-intl                    | TR/EN                                   |
| Analytics | PostHog (self-hosted)        | KVKK uyumlu                             |

### 4.2 Backend / Veritabanı

| Katman             | Teknoloji                 | Sebep                                      |
| ------------------ | ------------------------- | ------------------------------------------ |
| API                | Next.js API Routes + tRPC | Tip güvenli end-to-end                     |
| Veritabanı         | Supabase Postgres 16      | Bluedev pattern'i, RLS, gerçek zamanlı     |
| Auth               | Supabase Auth             | Email/şifre + sosyal + 2FA                 |
| Storage            | Supabase Storage          | ETABS dosyaları, raporlar, PDF'ler         |
| Vector DB          | Supabase pgvector         | TBDY-Copilot RAG                           |
| Cache / Rate Limit | Upstash Redis             | Serverless uyumlu                          |
| Queue              | Inngest                   | Background job (rapor üretimi, PDF render) |
| Email              | Resend                    | Transactional + marketing                  |

### 4.3 AI Katmanı

| Bileşen               | Model                         | Kullanım                                        |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| Karmaşık akıl yürütme | Claude Opus 4.7               | TBDY madde yorumu, peer-review, hata analizi    |
| Hızlı sorgular        | Claude Haiku 4.5              | Sınıflandırma, basit özet, ön-filtre            |
| Embedding             | OpenAI text-embedding-3-large | RAG vektörleri (Claude embedding desteklemiyor) |
| Orchestration         | Claude Managed Agents         | Multi-step iş akışları (Nisan 2026 launch)      |
| Prompt cache          | Anthropic prompt caching      | %70+ maliyet düşüşü (GümrükAI'da kanıtlı)       |

### 4.4 Masaüstü Bridge

| Katman          | Teknoloji                    | Sebep                                    |
| --------------- | ---------------------------- | ---------------------------------------- |
| Framework       | .NET 8 + WPF                 | ETABS COM/.NET API uyumu                 |
| ETABS API       | ETABSv1.dll (OAPI v21+)      | CSI resmi API                            |
| Auth            | OAuth 2.0 PKCE + cloud token | Browser'da giriş, token masaüstüne döner |
| Update          | Squirrel.Windows             | Otomatik güncelleme                      |
| Installer       | WiX Toolset                  | MSI üretimi, kurumsal deploy             |
| Crash reporting | Sentry                       | Hata izleme                              |

### 4.5 DevOps & Hosting

| Katman               | Teknoloji        | Maliyet (tahmin)               |
| -------------------- | ---------------- | ------------------------------ |
| Web hosting          | Vercel Pro       | ~$20/ay başlangıç              |
| Veritabanı           | Supabase Pro     | $25/ay başlangıç, $599+ scale  |
| Redis                | Upstash          | Pay-as-you-go ~$10/ay          |
| AI                   | Anthropic API    | Değişken; hedef ARR'nin %5–8'i |
| Email                | Resend           | $20/ay                         |
| CI/CD                | GitHub Actions   | Ücretsiz tier yeterli          |
| Monitoring           | Sentry + PostHog | $50/ay birlikte                |
| **Toplam başlangıç** |                  | **~$200/ay**                   |

---

## 5. VERİ MİMARİSİ

### 5.1 Çekirdek tablolar (Supabase Postgres)

```sql
-- Multi-tenancy temeli
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tax_number TEXT,                    -- VKN/TCKN
  e_invoice_alias TEXT,               -- E-fatura etiketi
  subscription_tier TEXT NOT NULL,    -- 'free', 'office', 'enterprise'
  seat_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL,                 -- 'owner', 'admin', 'engineer', 'auditor'
  imo_number TEXT,                    -- İMO sicil no (opsiyonel)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proje kavramı (tüm modüller buraya bağlanır)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  parsel_no TEXT,
  ada_no TEXT,
  ili TEXT,
  ilcesi TEXT,
  toplam_alan_m2 NUMERIC,
  kat_sayisi INT,
  tasiyici_sistem TEXT,              -- 'BAÇ', 'BAP', 'BAÇ-BAP', 'PERDE', vb.
  dts INT,                           -- Deprem Tasarım Sınıfı
  bys INT,                           -- Bina Yükseklik Sınıfı
  latitude NUMERIC,
  longitude NUMERIC,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modül 1: Ek-3 form
CREATE TABLE ek3_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  version INT DEFAULT 1,
  status TEXT NOT NULL,              -- 'draft', 'completed', 'signed'
  form_data JSONB NOT NULL,          -- Tüm form alanları
  pdf_url TEXT,                      -- Üretilen PDF Storage path
  generated_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);

-- Modül 2: ETABS sync ve raporlar
CREATE TABLE etabs_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  file_name TEXT NOT NULL,
  etabs_version TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,                    -- Kat, eleman sayıları vb.
  raw_data JSONB                     -- Bridge'den gelen tam veri
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  etabs_model_id UUID REFERENCES etabs_models(id),
  type TEXT NOT NULL,                -- 'tbdy_full', 'perde_only', 'oteleme', vb.
  status TEXT NOT NULL,              -- 'queued', 'generating', 'ready', 'failed'
  result JSONB,                      -- Hesaplama sonuçları
  ai_summary TEXT,                   -- Copilot tarafından üretilen özet
  pdf_url TEXT,
  html_url TEXT,
  generated_at TIMESTAMPTZ
);

-- Modül 3: Spektrum
CREATE TABLE spectrum_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  zemin_class TEXT,                  -- ZA/ZB/ZC/ZD/ZE
  vs30 NUMERIC,
  sds NUMERIC,
  sd1 NUMERIC,
  pga NUMERIC,
  spectrum_data JSONB,               -- Period-Sa çiftleri
  afad_response JSONB,               -- Ham AFAD API cevabı
  etabs_function_url TEXT,           -- Üretilen .txt dosya
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modül 4: AI sorgular
CREATE TABLE ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  query TEXT NOT NULL,
  context JSONB,                     -- Hangi rapor/eleman için
  response TEXT,
  model_used TEXT,                   -- 'claude-opus-4-7', vb.
  tokens_input INT,
  tokens_output INT,
  cache_hit BOOLEAN,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tbdy_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,              -- 'TBDY 2018', 'TS 500', 'YDY'
  madde TEXT,                        -- '4.9.2', 'Tablo 4.34a' vb.
  baslik TEXT,
  icerik TEXT NOT NULL,
  embedding vector(3072),            -- OpenAI text-embedding-3-large
  metadata JSONB
);

-- Modül 5: Billing
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  iyzico_subscription_id TEXT UNIQUE,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,              -- 'trialing', 'active', 'past_due', 'canceled'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  amount_try NUMERIC NOT NULL,
  vat_amount NUMERIC NOT NULL,
  e_invoice_uuid TEXT,               -- Foriba/Logo entegrasyon ID
  e_invoice_status TEXT,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ
);

-- Audit (kritik)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,              -- 'project.created', 'report.generated', vb.
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS politikaları (örnek)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_org_projects" ON projects
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
```

### 5.2 Storage bucket'ları

```
yapiops-storage/
├── etabs-models/{org_id}/{project_id}/{model_id}.edb
├── reports/{org_id}/{project_id}/{report_id}.pdf
├── reports-html/{org_id}/{project_id}/{report_id}/
├── ek3-pdfs/{org_id}/{project_id}/{ek3_id}.pdf
├── zemin-raporlari/{org_id}/{project_id}/{file_id}.pdf
└── invoices/{org_id}/{invoice_id}.pdf
```

---

## 6. KİMLİK DOĞRULAMA VE YETKİ

### 6.1 Auth akışı

**Web kullanıcısı:**

1. Email/şifre veya Google ile kayıt
2. Email doğrulama
3. Organizasyon oluşturma (ilk kullanıcı = owner)
4. 14 gün ücretsiz deneme aktif (kart bilgisi gerekmez)
5. JWT token (Supabase Auth) — 1 saat erişim, 1 hafta refresh

**Masaüstü Bridge:**

1. Bridge başladığında "Cloud'a bağlan" butonu
2. Browser açılır → cloud login → callback URL
3. OAuth 2.0 PKCE ile token bridge'e döner
4. Token Windows Credential Manager'da saklanır
5. Her API çağrısında token yenilenir

### 6.2 Rol matrisi

| Rol      | Proje         | Rapor        | Ek-3         | Billing | Org ayarları | Audit log |
| -------- | ------------- | ------------ | ------------ | ------- | ------------ | --------- |
| Owner    | CRUD          | CRUD         | CRUD         | RW      | RW           | R         |
| Admin    | CRUD          | CRUD         | CRUD         | R       | RW           | R         |
| Engineer | CRUD (atanan) | CRUD (kendi) | CRUD (kendi) | -       | -            | -         |
| Auditor  | R             | R            | R            | -       | -            | -         |

---

## 7. MODÜL ENTEGRASYON DESENİ

Her modül ortak primitive'leri kullanır:

```typescript
// packages/@yapiops/core/src/types.ts
export interface ModuleContext {
  user: User;
  org: Organization;
  project?: Project;
  audit: AuditLogger;
  permissions: PermissionChecker;
}

// Her modül service bu interface'i implement eder
export interface ModuleService<TInput, TOutput> {
  execute(ctx: ModuleContext, input: TInput): Promise<TOutput>;
  validateInput(input: TInput): ValidationResult;
  estimateCost(input: TInput): CostEstimate; // AI modülleri için
}
```

**Çağrı örneği (RaporX → TBDY-Copilot orchestration):**

```typescript
// apps/web/app/api/reports/[id]/generate/route.ts
export async function POST(req: Request, { params }) {
  const ctx = await getModuleContext(req);

  // 1. RaporX: TBDY hesaplamaları
  const reportResult = await raporxService.execute(ctx, {
    etabsModelId: params.id,
    checks: ['perde_kesme', 'oteleme', 'ikinci_mertebe'],
  });

  // 2. TBDY-Copilot: AI yorum (sadece "office+ai" planda)
  if (ctx.org.subscription_tier === 'office_ai') {
    const aiSummary = await copilotService.execute(ctx, {
      reportData: reportResult,
      style: 'professional_turkish',
    });
    reportResult.ai_summary = aiSummary.text;
  }

  // 3. PDF render (queue'ya at)
  await inngest.send({
    name: 'report.render-pdf',
    data: { reportId: reportResult.id },
  });

  // 4. Audit
  await ctx.audit.log('report.generated', { reportId: reportResult.id });

  return Response.json(reportResult);
}
```

---

## 8. AI KATMANI DETAYI

### 8.1 Model seçim kuralları

```typescript
// packages/@yapiops/ai/src/router.ts
export function selectModel(task: AITask): ClaudeModel {
  switch (task.type) {
    case 'classification':
    case 'simple_extraction':
    case 'short_summary':
      return 'claude-haiku-4-5';

    case 'tbdy_madde_yorumu':
    case 'peer_review':
    case 'rapor_anlati':
    case 'hata_analizi':
      return 'claude-opus-4-7';

    case 'multi_step_workflow':
      return 'claude-managed-agent'; // Nisan 2026 launch
  }
}
```

### 8.2 Prompt caching stratejisi

GümrükAI'daki pattern'i tekrarlıyoruz:

```typescript
const systemPrompt = {
  type: 'text',
  text: TBDY_SYSTEM_PROMPT, // ~15K token, sabit
  cache_control: { type: 'ephemeral' },
};

const tbdyContext = {
  type: 'text',
  text: relevantTBDYChunks, // ~20K token, sorguya göre değişir ama 1 oturumda sabit
  cache_control: { type: 'ephemeral' },
};

// İlk çağrı: tam maliyet
// Takip çağrılar (5 dk içinde): %90 indirim
```

### 8.3 RAG mimarisi (TBDY-Copilot)

```
┌─────────────────────────────────────────────────────────────┐
│  Kullanıcı sorusu: "Bu perdede 2. mertebe niye devreye     │
│  girdi?" + projectId + reportId                             │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Query enrichment (Haiku 4.5)                            │
│     → "2. mertebe etkisi tetikleyici koşullar TBDY perde"  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Embedding (OpenAI text-embedding-3-large)               │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. pgvector benzerlik araması (top 8)                      │
│     - TBDY 4.9.2 maddesi                                    │
│     - TS 500 ilgili kısım                                   │
│     - Önceki benzer projelerden örnek (anonim)              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Proje bağlamı yutma                                     │
│     - Rapordan ilgili perde verisi                          │
│     - 2. mertebe sonuçları                                  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Opus 4.7 ile cevap üretimi (cache'li)                  │
│     - Madde + neden + projeye özel yorum + öneri            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    Streaming cevap
```

---

## 9. GÜVENLİK VE UYUMLULUK

### 9.1 KVKK uyumu

- **Aydınlatma metni:** Kayıt ekranında onay zorunlu
- **Veri saklama:** ETABS dosyaları proje silindiğinde 30 gün sonra hard delete
- **Veri taşınabilirliği:** Tüm proje verileri JSON+ZIP export
- **Anonimleştirme:** AI eğitiminde müşteri verisi KULLANILMAZ (Anthropic Privacy Mode)
- **Yurt dışı transfer:** Anthropic ABD; aydınlatma metninde açıkça belirtilir

### 9.2 Mühendislik sorumluluğu sınırı

Kullanım Şartları'nda netleştirilecek:

- Yazılım hesaplama yardımcısıdır, mühendislik kararı değildir
- TBDY uygunluğu kontrolü mühendisin sorumluluğundadır
- Audit log mühendislik karar zincirini koruma amaçlıdır
- AI cevapları "danışma" amaçlıdır, mühendislik onayı yerine geçmez

### 9.3 Teknik güvenlik

- TLS 1.3 zorunlu, mTLS bridge için
- Supabase RLS tüm tablolarda
- Secret rotation: 90 günde bir (GitHub Actions otomasyonu)
- Pen-test: Yıl 2'de yıllık zorunluluk
- SOC 2 hazırlığı: Yıl 2 hedef

---

## 10. DEPLOYMENT VE OPERASYON

### 10.1 Ortamlar

| Ortam      | URL                       | Amaç       |
| ---------- | ------------------------- | ---------- |
| Local      | localhost:3000            | Geliştirme |
| Preview    | yapiops-pr-{n}.vercel.app | PR review  |
| Staging    | staging.yapiops.com       | QA         |
| Production | yapiops.com               | Canlı      |

### 10.2 CI/CD

```yaml
# .github/workflows/main.yml
name: CI/CD
on: [push, pull_request]

jobs:
  lint: # ESLint + Prettier + TypeScript check
  test: # Vitest unit tests
  test-tbdy: # TBDY hesaplama doğrulama (kritik)
  build: # Turbo build
  e2e: # Playwright (sadece main branch'e merge'de)
  deploy: # Vercel deploy (otomatik)
```

### 10.3 Monitoring

| Metrik      | Tool                  | Alarm eşiği      |
| ----------- | --------------------- | ---------------- |
| Uptime      | Vercel + Better Stack | <%99.5           |
| API latency | PostHog               | p95 > 2s         |
| Error rate  | Sentry                | >%1              |
| AI maliyet  | Custom dashboard      | Bütçe aşımı %80  |
| Veritabanı  | Supabase Dashboard    | Connection > %80 |

### 10.4 Backup ve disaster recovery

- Supabase otomatik PITR (Point-in-Time Recovery): 7 gün
- Storage bucket'ları: günlük snapshot, 30 gün tutma
- RTO (Recovery Time Objective): 4 saat
- RPO (Recovery Point Objective): 1 saat

---

## 11. 6 AYLIK BUILD ROADMAP — DETAYLI

### Faz 0: Foundation (Hafta 1–4)

**Hedef:** Monorepo + altyapı + auth + billing iskeleti çalışır.

- [ ] Hafta 1: Monorepo kurulumu (Turborepo + pnpm), CI/CD, ESLint/Prettier config
- [ ] Hafta 1: Supabase proje, ana schema migration'ları, RLS politikaları
- [ ] Hafta 2: Next.js 15 app, auth akışı (kayıt/giriş/email doğrulama)
- [ ] Hafta 2: shadcn/ui kurulumu, layout iskeletleri, i18n (TR/EN)
- [ ] Hafta 3: BillingCore — Iyzico abonelik akışı (test mode), 14 gün deneme
- [ ] Hafta 3: BillingCore — E-fatura entegrasyonu Foriba sandbox
- [ ] Hafta 4: Audit service, organizasyon yönetimi, multi-seat
- [ ] Hafta 4: Vercel staging deploy, Sentry/PostHog kurulum

### Faz 1: Ek3Pilot MVP (Hafta 5–12)

**Hedef:** Ek3Pilot canlıda, ilk 20 ofis hedefi.

- [ ] Hafta 5: Ek-3 form schema (Zod), wireframe, PDF şablonu (RG-30/05/2019-30789) analizi
- [ ] Hafta 6: Form UI (react-hook-form + shadcn), kaydet/yükle/versiyon
- [ ] Hafta 7: PDF üretimi (pdf-lib ile şablon doldurma)
- [ ] Hafta 8: Desktop bridge POC — ETABS'tan kat sayısı, alan, DTS okuma
- [ ] Hafta 9: Bridge → cloud sync, JWT auth, otomatik form doldurma
- [ ] Hafta 10: 5 beta kullanıcı, geri bildirim
- [ ] Hafta 11: Refinement — bug fix, UX, dokümantasyon
- [ ] Hafta 12: **Public lansman**, marketing site, fiyat sayfası, 14 gün deneme aktif

### Faz 2: RaporX Alpha (Hafta 13–20)

- [ ] Hafta 13: TBDY hesaplama kütüphanesi iskeleti (`@yapiops/tbdy`)
- [ ] Hafta 14: Perde eksenel kapasite + perde kesme kontrolü
- [ ] Hafta 15: Göreli kat ötelemesi + ikinci mertebe etkileri
- [ ] Hafta 16: Bridge'den ETABS sonuç verisi okuma genişletilmiş schema
- [ ] Hafta 17: HTML interaktif rapor template (Three.js 3D viewer)
- [ ] Hafta 18: PDF rapor (Puppeteer ile HTML → PDF)
- [ ] Hafta 19: 10 beta ofis, mühendislik doğrulama (manuel hesap karşılaştırma)
- [ ] Hafta 20: RaporX **public lansman**

### Faz 3: SpektrumHub + Copilot Alpha (Hafta 21–26)

- [ ] Hafta 21: AFAD API entegrasyonu, koordinat → spektrum
- [ ] Hafta 22: Zemin raporu PDF parser (Vs30, sınıf çıkarımı — Claude vision ile)
- [ ] Hafta 23: ETABS function dosyası export
- [ ] Hafta 24: TBDY-Copilot — TBDY 2018 chunking + embedding pipeline
- [ ] Hafta 25: RAG pipeline + Opus 4.7 entegrasyonu, prompt caching
- [ ] Hafta 26: SpektrumHub **public lansman**, Copilot **beta** (sadece "office+ai" plan)

---

## 12. FİYATLAMA STRATEJİSİ

| Plan           | Aylık  | Yıllık (12 ay öde, %15 indirim) | Dahil                                           |
| -------------- | ------ | ------------------------------- | ----------------------------------------------- |
| **Free**       | ₺0     | —                               | Ek3Pilot 3 proje/ay, 1 kullanıcı                |
| **Solo**       | ₺1.500 | ₺15.300                         | Ek3Pilot sınırsız + RaporX 5 rapor/ay, 1 seat   |
| **Office**     | ₺2.500 | ₺25.500                         | Tüm modüller + 3 seat + 50 rapor/ay             |
| **Office+AI**  | ₺3.500 | ₺35.700                         | Office + TBDY-Copilot + sınırsız rapor + 5 seat |
| **Enterprise** | Özel   | Özel                            | Office+AI + SSO + audit export + SLA + 10+ seat |

**Kullanım bazlı:**

- Ek seat: ₺350/ay
- TBDY-Copilot top-up: ₺500/100 sorgu
- Spektrum analizi tek seferlik: ₺250/proje

**Tek-proje müşteri (sözleşmeli olmayan):**

- Ek3Pilot tek seferlik: ₺750/proje
- RaporX tek seferlik: ₺1.500/proje

---

## 13. METRİKLER VE BAŞARI KRİTERLERİ

### 13.1 Kuzey yıldızı

**MARR (Monthly Active Reporting Revenue)** — Aylık aktif gerçek rapor üreten ofis sayısı × ortalama lisans bedeli.

### 13.2 Faz başına hedefler

| Faz        | Süre  | MAU   | ARR   | Müşteri          |
| ---------- | ----- | ----- | ----- | ---------------- |
| Faz 0      | 1 ay  | 0     | 0     | 5 design partner |
| Faz 1      | 3 ay  | 50    | ₺200K | 20 ofis          |
| Faz 2      | 6 ay  | 150   | ₺900K | 60 ofis          |
| Faz 3      | 9 ay  | 350   | ₺2.5M | 130 ofis         |
| Yıl 1 sonu | 12 ay | 600   | ₺5M   | 220 ofis         |
| Yıl 2 sonu | 24 ay | 1.500 | ₺12M  | 500 ofis         |

### 13.3 Operasyonel

- Ek-3 üretim süresi: <30 saniye (manuel modda <5 dk)
- RaporX hesaplama: <60 saniye (orta büyüklükte model)
- Spektrum üretimi: <10 saniye
- AI yanıt süresi (cache hit): <3 saniye
- Müşteri destek SLA: <4 saat ilk yanıt (iş günü)

---

## 14. RİSKLER VE AZALTIM

| Risk                                            | Olasılık | Etki   | Azaltım                                           |
| ----------------------------------------------- | -------- | ------ | ------------------------------------------------- |
| Etex'in büyümesi / Demir partnership atması     | Düşük    | Orta   | Pazarda hız + multi-modül paket                   |
| ProtaStructure kendi eklenti suite'ini çıkarır  | Orta     | Yüksek | Niche + AI farkı + e-fatura entegre               |
| ETABS OAPI breaking change                      | Düşük    | Yüksek | Bridge'i version-aware yap, 2 versiyon destekle   |
| Yapı denetim yönetmeliği değişir (Ek-3 değişir) | Orta     | Orta   | Form'u JSON schema ile yapılandır, kolay güncelle |
| AI maliyetleri yükselir                         | Orta     | Orta   | Haiku ön-filtre, prompt caching, kullanım sınırı  |
| Tek-kişi bağımlılığı (Bluedev Aydoğan)          | Yüksek   | Yüksek | Faz 2'de junior dev hire, dokümantasyon           |
| Müşteri AI'ya güvensiz                          | Orta     | Düşük  | "Danışma amaçlı, mühendis onayı şart" netleştir   |
| Iyzico/Foriba downtime                          | Düşük    | Orta   | Manuel fatura fallback, retry kuyrukları          |

---

## 15. CLAUDE CODE İÇİN ÇALIŞTIRMA TALİMATI

Bu dosya `docs-internal/CLAUDE.md` olarak repo'ya konulduktan sonra Claude Code ile şu sırayla çalışılmalı:

```bash
# 1. Repo init
mkdir yapiops && cd yapiops
git init
pnpm dlx create-turbo@latest .

# 2. Bu CLAUDE.md'yi docs-internal/ altına yerleştir
mkdir -p docs-internal/modules docs-internal/adr
cp /path/to/CLAUDE.md docs-internal/

# 3. Claude Code başlat
claude code
```

Sonra Claude'a şu prompt'u verin:

```
docs-internal/CLAUDE.md dosyasını oku. Faz 0'dan başlayarak monorepo
yapısını kur. Her dosya oluşturduğunda CLAUDE.md'deki yapıya birebir uy.
Faz 0 tamamlandığında bana checklist üzerinden rapor ver.
```

Modül-spesifik detaylar için Claude Code aşağıdaki dosyaları talep edecektir:

- `docs-internal/modules/ek3pilot.md` — Ek-3 form alan-alan spec
- `docs-internal/modules/raporx.md` — TBDY hesaplama formülleri ve test vakaları
- `docs-internal/modules/spektrumhub.md` — AFAD API + parser detayı
- `docs-internal/modules/copilot.md` — RAG pipeline + prompt template
- `docs-internal/modules/billing.md` — Iyzico + e-fatura akışı

Bu modül dosyaları bir sonraki adımda hazırlanacak.

---

## 16. SONRAKİ ADIMLAR

1. **Bu CLAUDE.md'yi gözden geçir** — eksik/yanlış nokta var mı?
2. **Modül dosyalarından birini sıraya al** — hangisi ilk önemli?
3. **Stitch UI ile Ek3Pilot wireframe'leri** üret (AREMKA'daki pattern)
4. **Domain/marka kararı** — `yapiops.com` müsait mi? Türkçe alternatif?
5. **5 design partner** belirle ve LinkedIn üzerinden temas

---

**Belge sonu — v1.0.0**
