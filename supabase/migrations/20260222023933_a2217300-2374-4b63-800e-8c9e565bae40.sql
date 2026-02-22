DROP VIEW IF EXISTS public.edge_performance;
CREATE VIEW public.edge_performance WITH (security_invoker = true) AS
SELECT
  edge_bucket,
  total_games,
  wins,
  losses,
  win_rate,
  avg_edge,
  avg_volume
FROM (
  SELECT
    CASE
      WHEN ABS(edge_pct) >= 5 THEN '5%+'
      WHEN ABS(edge_pct) >= 3 THEN '3-5%'
      WHEN ABS(edge_pct) >= 1 THEN '1-3%'
      ELSE '<1%'
    END AS edge_bucket,
    CASE
      WHEN ABS(edge_pct) >= 5 THEN 1
      WHEN ABS(edge_pct) >= 3 THEN 2
      WHEN ABS(edge_pct) >= 1 THEN 3
      ELSE 4
    END AS sort_order,
    COUNT(*) AS total_games,
    COUNT(CASE WHEN edge_team_won = true THEN 1 END) AS wins,
    COUNT(CASE WHEN edge_team_won = false AND result != 'push' THEN 1 END) AS losses,
    ROUND(
      COUNT(CASE WHEN edge_team_won = true THEN 1 END)::numeric /
      NULLIF(COUNT(CASE WHEN result != 'push' THEN 1 END), 0) * 100, 1
    ) AS win_rate,
    ROUND(AVG(ABS(edge_pct))::numeric, 1) AS avg_edge,
    ROUND(AVG(poly_volume)::numeric, 0) AS avg_volume
  FROM public.edge_scans
  WHERE result IS NOT NULL
  GROUP BY edge_bucket, sort_order
  ORDER BY sort_order
) sub;