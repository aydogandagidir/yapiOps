-- =============================================================================
-- Migration: 0007 — Security hardening (Supabase advisor warnings)
-- =============================================================================
-- 0001'deki helper fonksiyonlar ve trigger fn'i Supabase Security Advisor'dan
-- iki uyarı yığını topluyordu:
--
--   1. function_search_path_mutable (3 fn)
--      SECURITY DEFINER fonksiyonlarda search_path explicit set edilmediği
--      için saldırgan PATH-injection ile schema-shadowing yapabilir.
--      Çözüm: SET search_path = public, pg_temp.
--
--   2. anon/authenticated_security_definer_function_executable (4 uyarı)
--      Helper fonksiyonlar (current_user_org_id, current_user_has_role)
--      `/rest/v1/rpc/*` üzerinden anon ve authenticated rolleri tarafından
--      doğrudan çağrılabilir durumdaydı. Bunlar RLS policy'leri içinde
--      kullanılmak için yazılmış internal helper'lardır; PostgREST API
--      seviyesinde callable olmamalı.
--      Çözüm: REVOKE EXECUTE FROM anon, authenticated.
--
-- vector extension'ın `public` yerine `extensions` schema'sına taşınması
-- (extension_in_public) bilinçli olarak ertelendi — TBDY-Copilot Faz 3'te
-- pgvector index'leri eklendiğinde bu refactor yapılacak.
-- =============================================================================

-- 1) Helper function search_path lock
ALTER FUNCTION public.current_user_org_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_user_has_role(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;

-- 2) Revoke anonymous + PUBLIC RPC access on internal helpers
--
-- PostgreSQL'de SECURITY DEFINER fonksiyonlar caller'ın EXECUTE iznini
-- gerektirir; owner privileges sadece fonksiyon GÖVDESİ içinde geçerli.
-- Bu yüzden authenticated'a EXECUTE tutmak ZORUNDAYIZ — RLS policy
-- expression'ları (örn. `org_id = current_user_org_id()`) authenticated
-- context'te çağrıldığında bu izin olmazsa 42501 → tüm uygulama kırılır.
--
-- PUBLIC + anon'dan REVOKE etmek yeterli güvenlik:
--   - anon zaten auth.uid() = null görür → fonksiyon meaningful sonuç dönmez
--   - PUBLIC default GRANT'tan kurtulur, advisor o uyarıyı temizler
-- authenticated için /rest/v1/rpc/* çağrı imkânı kalır ama dönen değer
-- sadece kendi org_id/role'üdür → saldırı yüzeyi minimal.
REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(text) TO authenticated;
