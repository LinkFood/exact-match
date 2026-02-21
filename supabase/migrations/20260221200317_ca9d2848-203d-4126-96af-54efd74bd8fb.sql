
CREATE TABLE public.edge_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  game_date DATE NOT NULL,
  scan_id UUID NOT NULL,
  poly_event_id TEXT,
  poly_slug TEXT,
  odds_api_game_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  poly_price DECIMAL(5,4),
  book_consensus DECIMAL(5,4) NOT NULL,
  edge_pct DECIMAL(5,3) NOT NULL,
  poly_volume DECIMAL(12,2),
  num_books INTEGER,
  tip_off_time TIMESTAMPTZ,
  hours_to_tipoff DECIMAL(5,1),
  edge_team TEXT NOT NULL,
  signal TEXT,
  book_lines JSONB,
  result TEXT,
  edge_team_won BOOLEAN,
  settled_at TIMESTAMPTZ,
  sport TEXT DEFAULT 'ncaab',
  UNIQUE(odds_api_game_id, game_date)
);

CREATE INDEX idx_edge_scans_game_date ON public.edge_scans(game_date);
CREATE INDEX idx_edge_scans_result ON public.edge_scans(result);

ALTER TABLE public.edge_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.edge_scans FOR SELECT USING (true);
CREATE POLICY "Allow service role insert/update" ON public.edge_scans FOR ALL USING (true);

CREATE VIEW public.edge_performance AS
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
