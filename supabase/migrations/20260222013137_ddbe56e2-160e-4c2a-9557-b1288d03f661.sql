-- Drop the dependent view, widen the column, recreate the view
DROP VIEW IF EXISTS edge_performance;

ALTER TABLE edge_scans ALTER COLUMN edge_pct TYPE DECIMAL(7,3);

CREATE VIEW edge_performance WITH (security_invoker = true) AS
SELECT
  CASE
    WHEN abs(edge_pct) >= 5 THEN '5%+'
    WHEN abs(edge_pct) >= 3 THEN '3-5%'
    WHEN abs(edge_pct) >= 1 THEN '1-3%'
    ELSE '<1%'
  END AS edge_bucket,
  count(*) AS total_games,
  count(CASE WHEN edge_team_won THEN 1 END) AS wins,
  count(CASE WHEN edge_team_won = false THEN 1 END) AS losses,
  round(100.0 * count(CASE WHEN edge_team_won THEN 1 END)::numeric / NULLIF(count(CASE WHEN result IS NOT NULL THEN 1 END), 0)::numeric, 1) AS win_rate,
  round(avg(abs(edge_pct)), 2) AS avg_edge,
  round(avg(poly_volume), 0) AS avg_volume
FROM edge_scans
WHERE result IS NOT NULL
GROUP BY
  CASE
    WHEN abs(edge_pct) >= 5 THEN '5%+'
    WHEN abs(edge_pct) >= 3 THEN '3-5%'
    WHEN abs(edge_pct) >= 1 THEN '1-3%'
    ELSE '<1%'
  END;