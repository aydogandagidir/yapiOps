-- =============================================================================
-- Migration: 0006 — Table-level GRANTs for `authenticated` role
-- =============================================================================
-- _apply-all.sql STEP 0 yaptığı `DROP SCHEMA public CASCADE; CREATE SCHEMA
-- public` Supabase'in default tablo-level GRANT'larını sıfırlıyor.
-- Sonuç: RLS policy'leri tanımlı olsa bile her authenticated query
-- PostgreSQL'in tablo-level access kontrolüne takılıyordu:
--
--   ERROR: 42501: permission denied for table users
--   HINT: GRANT SELECT ON public.users TO authenticated;
--
-- RLS satır seviyesinde, GRANT tablo seviyesinde kısıtlama; ikisi birlikte
-- çalışır. GRANT olmadan RLS'ye erişilmiyor → tüm `from('users')`,
-- `from('organizations')` vb. sorguları null/error döndürüyordu →
-- `getOrgMembership` her zaman null → dashboard layout sonsuz redirect.
--
-- `anon` bilinçli olarak hariç: bu app'te anonymous read/write kullanılan
-- bir tablo yok (TBDY chunks bile authenticated-only).
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Future tables auto-inherit so a new migration adding a table doesn't
-- silently break the same way.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
