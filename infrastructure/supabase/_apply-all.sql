-- =============================================================================
-- _apply-all.sql — Tüm migration'ları SIFIRDAN uygulayan tek-seferlik dosya
-- =============================================================================
-- Bu dosya `infrastructure/supabase/migrations/0001..0005`'i ve baştaki
-- `public` schema reset'ini birleştirir. Boş bir Supabase projesinde tek
-- copy-paste ile çalışır. Production'da CI/CD migration zinciri yerine
-- kullanılmaz; sadece manuel bootstrap için.
--
-- Sırayla:
--   0. public schema'yı sıfırla (yarım kalan tablolardan kurtul)
--   1. 0001_initial_schema.sql
--   2. 0002_org_invitations.sql
--   3. 0003_ek3_templates.sql
--   4. 0004_storage_buckets.sql
--   5. 0005_user_email_preferences.sql

-- =============================================================================
-- STEP 0 — Reset public schema
-- =============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- STEP 1 — 0001_initial_schema.sql
-- =============================================================================
-- =============================================================================
-- Migration: 0001 — Initial schema
-- =============================================================================
-- This migration creates the core multi-tenant structure for YapıOps Suite.
-- All tables enforce Row Level Security based on org membership.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for AI embeddings

-- =============================================================================
-- ORGANIZATIONS & USERS (multi-tenancy foundation)
-- =============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tax_number TEXT,
  e_invoice_alias TEXT,
  billing_address JSONB,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  seat_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orgs_slug ON organizations(slug);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'engineer'
    CHECK (role IN ('owner', 'admin', 'engineer', 'auditor')),
  imo_number TEXT,
  phone TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX idx_users_org ON users(org_id);

-- =============================================================================
-- PROJECTS (central entity, all modules link here)
-- =============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pafta_no TEXT,
  ada_no TEXT,
  parsel_no TEXT,
  il TEXT,
  ilce TEXT,
  mahalle TEXT,
  toplam_alan_m2 NUMERIC(10,2),
  bodrum_kat_sayisi INT,
  zemin_ustu_kat_sayisi INT,
  toplam_yukseklik_m NUMERIC(8,2),
  tasiyici_sistem TEXT,
  dts INT CHECK (dts BETWEEN 1 AND 4),
  bys INT CHECK (bys BETWEEN 1 AND 8),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_org ON projects(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_projects_creator ON projects(created_by);

-- =============================================================================
-- EK3 FORMS
-- =============================================================================

CREATE TABLE ek3_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'completed', 'signed', 'superseded')),
  form_data JSONB NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES ek3_forms(id),
  supersedes UUID REFERENCES ek3_forms(id),
  revision_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ek3_project ON ek3_forms(project_id);
CREATE INDEX idx_ek3_org_status ON ek3_forms(org_id, status);

-- =============================================================================
-- ETABS MODELS (uploaded from desktop bridge)
-- =============================================================================

CREATE TABLE etabs_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  etabs_version TEXT,
  file_size_bytes BIGINT,
  units TEXT,
  storage_url TEXT,
  metadata JSONB,
  raw_data JSONB,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_etabs_project ON etabs_models(project_id, uploaded_at DESC);

-- =============================================================================
-- REPORTS (RaporX output)
-- =============================================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  etabs_model_id UUID REFERENCES etabs_models(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'generating', 'ready', 'failed')),
  checks_requested TEXT[] NOT NULL DEFAULT '{}',
  result JSONB,
  ai_summary TEXT,
  pdf_url TEXT,
  html_url TEXT,
  error_message TEXT,
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_reports_project ON reports(project_id, created_at DESC);
CREATE INDEX idx_reports_status ON reports(status) WHERE status IN ('queued', 'generating');

CREATE TABLE report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  element_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- SPEKTRUM (SpektrumHub)
-- =============================================================================

CREATE TABLE spectrum_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  zemin_class TEXT CHECK (zemin_class IN ('ZA','ZB','ZC','ZD','ZE','ZF')),
  vs30 NUMERIC(7,2),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  deprem_duzeyi TEXT,
  ss NUMERIC(8,4),
  s1 NUMERIC(8,4),
  pga NUMERIC(8,4),
  pgv NUMERIC(8,4),
  fs NUMERIC(8,4),
  f1 NUMERIC(8,4),
  sds NUMERIC(8,4),
  sd1 NUMERIC(8,4),
  spectrum_data JSONB,
  zemin_raporu_url TEXT,
  zemin_raporu_extracted JSONB,
  afad_raw_response JSONB,
  etabs_function_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_spectrum_project ON spectrum_analyses(project_id);

-- =============================================================================
-- AI / TBDY-COPILOT
-- =============================================================================

CREATE TABLE tbdy_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  bolum TEXT,
  altbolum TEXT,
  madde TEXT,
  baslik TEXT,
  icerik TEXT NOT NULL,
  embedding vector(3072),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NOTE: pgvector's ivfflat index max 2000 dimensions, but OpenAI
-- text-embedding-3-large produces 3072. Faz 3'te TBDY-Copilot devreye
-- alındığında ayrı bir migration ile `hnsw + halfvec(3072)` index ekleyeceğiz.
-- Faz 1 boyunca tablo boş; sequential scan yeterli.
-- CREATE INDEX idx_tbdy_embedding ON tbdy_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_tbdy_madde ON tbdy_chunks(source, madde);

CREATE TABLE ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id),
  query TEXT NOT NULL,
  context JSONB,
  rag_chunks UUID[],
  response TEXT,
  model_used TEXT,
  tokens_input INT,
  tokens_output INT,
  cache_read_tokens INT,
  cache_creation_tokens INT,
  cost_usd NUMERIC(10,6),
  latency_ms INT,
  user_feedback INT CHECK (user_feedback IN (-1, 0, 1)),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_queries_user ON ai_queries(user_id, created_at DESC);
-- Aylık usage sorguları (`WHERE org_id = ? AND created_at >= ?`) için range
-- index. `date_trunc('month', created_at)` IMMUTABLE değil, Postgres
-- expression-index'te reddeder; basit composite index aynı planı yakalar.
CREATE INDEX idx_ai_queries_org_month ON ai_queries(org_id, created_at DESC);

-- =============================================================================
-- BILLING
-- =============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  iyzico_subscription_id TEXT UNIQUE,
  iyzico_customer_id TEXT,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  iyzico_payment_id TEXT,
  amount_try NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(4,2) NOT NULL DEFAULT 20,
  vat_amount NUMERIC(10,2) NOT NULL,
  total_with_vat NUMERIC(10,2) NOT NULL,
  e_invoice_uuid TEXT,
  e_invoice_status TEXT,
  e_invoice_pdf_url TEXT,
  e_invoice_xml_url TEXT,
  ettn TEXT,
  status TEXT NOT NULL,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_invoices_org ON invoices(org_id, created_at DESC);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id),
  feature TEXT NOT NULL,
  resource_id UUID,
  cost_usd NUMERIC(10,6),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_usage_org_feature_month ON usage_records(
  org_id, feature, created_at DESC
);

CREATE TABLE firma_sablonlari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('muteahhit', 'denetim')),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_org_time ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ek3_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE etabs_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectrum_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE firma_sablonlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's org_id
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$;

-- Helper function: check role
CREATE OR REPLACE FUNCTION current_user_has_role(check_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = check_role
  )
$$;

-- Generic org-scoped policy applied to most tables
CREATE POLICY "users_see_own_org_data" ON projects
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_ek3" ON ek3_forms
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_etabs" ON etabs_models
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_reports" ON reports
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_spectrum" ON spectrum_analyses
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_ai" ON ai_queries
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_invoices" ON invoices
  FOR SELECT USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_usage" ON usage_records
  FOR SELECT USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_subscription" ON subscriptions
  FOR SELECT USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_sablon" ON firma_sablonlari
  FOR ALL USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org" ON organizations
  FOR SELECT USING (id = current_user_org_id());

CREATE POLICY "users_see_own_org_users" ON users
  FOR SELECT USING (org_id = current_user_org_id());

CREATE POLICY "users_see_own_org_audit" ON audit_logs
  FOR SELECT USING (
    org_id = current_user_org_id()
    AND (current_user_has_role('owner') OR current_user_has_role('admin'))
  );

-- Report comments visible if you can see the parent report
CREATE POLICY "users_see_report_comments" ON report_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_comments.report_id
        AND r.org_id = current_user_org_id()
    )
  );

-- TBDY chunks are public (read-only for all authenticated users)
ALTER TABLE tbdy_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tbdy_chunks_read_all" ON tbdy_chunks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ek3_updated_at BEFORE UPDATE ON ek3_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- STEP 2 — 0002_org_invitations.sql
-- =============================================================================

-- Migration: 0002_org_invitations.sql
-- Adds the multi-seat invitation flow used by Hafta 4 of Phase 0.
--
-- Each row represents a pending invitation. Once `accepted_at` is set, the
-- invited user has joined the org and the row stays for audit history.

CREATE TABLE org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'engineer', 'auditor')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_org_invitations_org_id ON org_invitations(org_id);
CREATE INDEX idx_org_invitations_email ON org_invitations(email) WHERE accepted_at IS NULL;
CREATE INDEX idx_org_invitations_token ON org_invitations(token) WHERE accepted_at IS NULL;

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Owners and admins of an org can manage its invitations.
CREATE POLICY "owners_admins_manage_invites" ON org_invitations
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Anonymous users can read an invitation by token (needed for the accept page
-- before they sign up). Restricted to non-accepted, non-expired rows.
CREATE POLICY "public_read_pending_invite_by_token" ON org_invitations
  FOR SELECT
  USING (accepted_at IS NULL AND expires_at > NOW());


-- =============================================================================
-- STEP 3 — 0003_ek3_templates.sql
-- =============================================================================

-- =============================================================================
-- Migration: 0003 — Ek-3 PDF template registry
-- =============================================================================
-- Tracks every Ek-3 PDF template the system has seen — both the official
-- Bakanlık form (auto-fetched from the Resmî Gazete / Çevre Şehircilik
-- Bakanlığı public sources) and any manual upload an org owner provides.
--
-- A daily Vercel Cron job hits `/api/cron/ek3-template-sync`, which compares
-- the fetched bytes' SHA-256 against the most recent row. If the hash differs,
-- a new row is inserted, the bytes are pushed to the `ek3-templates` Storage
-- bucket, and the new row is activated. Renderer reads the active row at PDF
-- generation time.

CREATE TABLE ek3_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable version label. Auto-fetched rows use the publication date
  -- (e.g. "2019-05-30"); manual uploads default to ISO timestamp + uploader
  -- initial.
  version TEXT NOT NULL,

  source TEXT NOT NULL CHECK (source IN ('official_fetch', 'manual_upload')),

  -- Canonical source URL — populated for `official_fetch`, NULL otherwise.
  source_url TEXT,

  -- Storage path inside the `ek3-templates` bucket. Convention:
  -- `ek3-templates/{id}.pdf`. Renderer downloads via service role.
  storage_path TEXT NOT NULL,

  -- SHA-256 of the raw PDF bytes. Lets the cron job decide "is this a new
  -- version of the form?" without doing a byte-by-byte diff.
  sha256 TEXT NOT NULL UNIQUE,

  size_bytes BIGINT,

  -- When the cron / upload last successfully wrote this row. NULL means the
  -- row was created by a migration / seed.
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  uploaded_by UUID REFERENCES users(id),

  -- Exactly one row should be active at a time. The partial unique index
  -- below enforces that.
  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ek3_templates_active ON ek3_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ek3_templates_fetched ON ek3_templates(fetched_at DESC);

-- Enforce "at most one active row" via a partial unique index on a constant.
CREATE UNIQUE INDEX idx_ek3_templates_one_active
  ON ek3_templates ((TRUE)) WHERE is_active = TRUE;

CREATE TRIGGER ek3_templates_updated_at BEFORE UPDATE ON ek3_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE ek3_templates ENABLE ROW LEVEL SECURITY;

-- Read: every authenticated user can see the active template (so the renderer
-- can fetch it via RLS-aware client). Owner/admin can see history.
CREATE POLICY "ek3_templates_read_active" ON ek3_templates
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      is_active = TRUE
      OR current_user_has_role('owner')
      OR current_user_has_role('admin')
    )
  );

-- Write: owner/admin only. Org-scoped check is unnecessary because templates
-- are global (one official form for every Turkish building inspection).
CREATE POLICY "ek3_templates_write_admin" ON ek3_templates
  FOR ALL USING (
    current_user_has_role('owner') OR current_user_has_role('admin')
  ) WITH CHECK (
    current_user_has_role('owner') OR current_user_has_role('admin')
  );


-- =============================================================================
-- STEP 4 — 0004_storage_buckets.sql
-- =============================================================================

-- =============================================================================
-- Migration: 0004 — Storage buckets + RLS
-- =============================================================================
-- ek3-templates: official Bakanlık form PDF + manual uploads (private; only
-- authenticated users can read; only owner/admin can write).
-- ek3-pdfs: generated Ek-3 PDFs scoped per org/project (org members see their
-- own; other orgs blocked via path prefix check).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ek3-templates', 'ek3-templates', false, 10 * 1024 * 1024, ARRAY['application/pdf']),
  ('ek3-pdfs',      'ek3-pdfs',      false,  5 * 1024 * 1024, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- ek3-templates RLS
-- =============================================================================

CREATE POLICY "ek3_templates_storage_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ek3-templates'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "ek3_templates_storage_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ek3-templates'
    AND (current_user_has_role('owner') OR current_user_has_role('admin'))
  );

CREATE POLICY "ek3_templates_storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'ek3-templates'
    AND (current_user_has_role('owner') OR current_user_has_role('admin'))
  );

CREATE POLICY "ek3_templates_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ek3-templates'
    AND (current_user_has_role('owner') OR current_user_has_role('admin'))
  );

-- =============================================================================
-- ek3-pdfs RLS
-- =============================================================================
-- Path convention: `{org_id}/{project_id}/{ek3_id}.pdf`. Path prefix matches
-- the user's org_id → no cross-org leakage even if someone guesses a UUID.

CREATE POLICY "ek3_pdfs_storage_read_own_org" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ek3-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

CREATE POLICY "ek3_pdfs_storage_write_own_org" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ek3-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

CREATE POLICY "ek3_pdfs_storage_update_own_org" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'ek3-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

CREATE POLICY "ek3_pdfs_storage_delete_own_org" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ek3-pdfs'
    AND (current_user_has_role('owner') OR current_user_has_role('admin'))
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );


-- =============================================================================
-- STEP 5 — 0005_user_email_preferences.sql
-- =============================================================================
-- `users.preferences` JSONB zaten 0001'de tanımlı (`DEFAULT '{}'`). Bu adım
-- default'u zenginleştirir + mevcut satırları doldurur (KVKK transactional
-- opt-in). Fresh bootstrap'ta `users` boş — UPDATE no-op olur, default geçerli.

ALTER TABLE users
  ALTER COLUMN preferences SET DEFAULT
    '{"email_ek3_generated": true, "email_weekly_digest": false}'::jsonb;

UPDATE users
SET preferences = preferences || '{"email_ek3_generated": true}'::jsonb
WHERE NOT (preferences ? 'email_ek3_generated');

UPDATE users
SET preferences = preferences || '{"email_weekly_digest": false}'::jsonb
WHERE NOT (preferences ? 'email_weekly_digest');
