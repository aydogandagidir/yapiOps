-- =============================================================================
-- Migration: 0005 — User email preferences default
-- =============================================================================
-- `users.preferences` JSONB zaten 0001'de tanımlı (`DEFAULT '{}'`). Bu
-- migration default'u zenginleştirir + mevcut satırları doldurur.
-- KVKK transactional muafiyeti kapsamında "Ek-3 üretildi" e-postası default
-- opt-in; kullanıcı /settings/notifications altında opt-out yapabilir.

ALTER TABLE users
  ALTER COLUMN preferences SET DEFAULT
    '{"email_ek3_generated": true, "email_weekly_digest": false}'::jsonb;

UPDATE users
SET preferences = preferences || '{"email_ek3_generated": true}'::jsonb
WHERE NOT (preferences ? 'email_ek3_generated');

UPDATE users
SET preferences = preferences || '{"email_weekly_digest": false}'::jsonb
WHERE NOT (preferences ? 'email_weekly_digest');
