-- ============================================================
-- FIX 1: Set GUC variables required by pg_cron jobs
-- ============================================================
-- pg_cron jobs use current_setting('app.settings.supabase_url')
-- and current_setting('app.settings.service_role_key') to call
-- edge functions. These are NOT automatically set by Supabase.
--
-- IMPORTANT: Replace the placeholder values below with your
-- actual Supabase project URL and service role key BEFORE
-- running this migration.
--
-- You can find these values in:
--   Supabase Dashboard → Settings → API
-- ============================================================

ALTER DATABASE postgres SET app.settings.supabase_url = 'REPLACE_WITH_YOUR_SUPABASE_URL';
ALTER DATABASE postgres SET app.settings.service_role_key = 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY';
