
-- Fix: Replace overly permissive insert/update policy with service-role-only
DROP POLICY "Allow service role insert/update" ON public.edge_scans;

-- Only service role can insert/update (anon/authenticated cannot)
CREATE POLICY "Service role can manage edge_scans" ON public.edge_scans
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Fix: Make view SECURITY INVOKER (default for new views but explicit is better)
DROP VIEW public.edge_performance;
CREATE VIEW public.edge_performance WITH (security_invoker = true) AS
SELECT
  CASE
    WHEN ABS(edge_pct) >= 5 THEN '5%+'
    WHEN ABS(edge_pct) >= 3 THEN '3-5%'
    WHEN ABS(edge_pct) >= 1 THEN '1-3%'
    ELSE '<1%'
  END AS edge_bucket,
  COUNT(*) AS total_games,
  COUNT(CASE WHEN edge_team_won THEN 1 END) AS wins,
  COUNT(CASE WHEN edge_team_won = false THEN 1 END) AS losses,
  ROUND(100.0 * COUNT(CASE WHEN edge_team_won THEN 1 END)
    / NULLIF(COUNT(CASE WHEN result IS NOT NULL THEN 1 END), 0), 1) AS win_rate,
  ROUND(AVG(ABS(edge_pct))::numeric, 2) AS avg_edge,
  ROUND(AVG(poly_volume)::numeric, 0) AS avg_volume
FROM public.edge_scans
WHERE result IS NOT NULL
GROUP BY edge_bucket;
