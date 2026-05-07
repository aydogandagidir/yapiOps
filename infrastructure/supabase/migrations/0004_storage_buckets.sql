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
