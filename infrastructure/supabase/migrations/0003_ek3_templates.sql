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
