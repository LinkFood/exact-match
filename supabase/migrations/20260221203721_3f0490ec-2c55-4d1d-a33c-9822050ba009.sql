
-- Cache for Odds API data (reused across 5-min scans)
CREATE TABLE public.cached_odds (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cached_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cached_odds"
  ON public.cached_odds FOR SELECT USING (true);

CREATE POLICY "Service role manages cached_odds"
  ON public.cached_odds FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Track scan metadata per sport
CREATE TABLE public.scan_meta (
  id TEXT PRIMARY KEY,
  last_odds_fetch TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.scan_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read scan_meta"
  ON public.scan_meta FOR SELECT USING (true);

CREATE POLICY "Service role manages scan_meta"
  ON public.scan_meta FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Alert deduplication log
CREATE TABLE public.alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poly_event_id TEXT NOT NULL,
  alert_date DATE NOT NULL,
  last_edge DECIMAL(6,3),
  alerted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poly_event_id, alert_date)
);

ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read alert_log"
  ON public.alert_log FOR SELECT USING (true);

CREATE POLICY "Service role manages alert_log"
  ON public.alert_log FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Enable pg_net for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
