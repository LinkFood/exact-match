

## PolyEdge V2 — Matching Hardening, Edge Tracker, UI Upgrades

This is a large feature set. Here is the implementation broken into ordered phases.

---

### Phase 1: Matching Hardening (Edge Function)

**File: `supabase/functions/scan-games/index.ts`**

The core State/St normalization is already in place (`\bst\.?\b` -> "state"). What's missing are specific alias entries for teams still failing to match:

- Add to `SCHOOL_ALIASES`:
  - `"kansas city"` -> `"missouri kansas city"` (Kansas City Roos vs UMKC Kangaroos)
  - `"sam houston state"` -> `"sam houston"` (normalize both directions)
  - `"massachusetts lowell"` -> `"umass lowell"`, `"umass lowell"` -> `"massachusetts lowell"` (pick one canonical)
  - `"ut arlington"` -> `"texas arlington"`
  - `"southeastern missouri state"` -> `"southeast missouri state"`

- Add to `MASCOT_SUFFIXES`: `"Roos"` (Kansas City Roos)

- Fix alias matching: Currently `SCHOOL_ALIASES` does exact key match (`SCHOOL_ALIASES[n]`). For multi-word aliases like `"florida int'l"`, need to also check if the normalized name starts with the alias key. Change to iterate aliases and check `n === key || n.startsWith(key + ' ')`.

Expected: 10-15 additional matches on top of existing improvements.

---

### Phase 2: Database — `edge_scans` Table

**New table via migration:**

```sql
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
```

**View for performance summary:**

```sql
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
```

RLS is public-read since this data is not user-specific (no auth required). Service role key is used in edge functions for inserts.

---

### Phase 3: Edge Logging in scan-games

**File: `supabase/functions/scan-games/index.ts`**

After building the `games` array (line ~443), add a block that:

1. Creates a Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env
2. Generates a `scanId` UUID
3. Maps each game to an `edge_scans` row
4. Upserts into `edge_scans` on `(odds_api_game_id, game_date)` so only the latest scan per game is kept
5. Wraps in try/catch so logging failures don't break the scan response

```text
const scanId = crypto.randomUUID();
const rows = games.map(g => ({
  scan_id: scanId,
  game_date: todayStr,
  odds_api_game_id: g.id,
  poly_event_id: g.polyMarketSlug,
  poly_slug: g.polyMarketSlug,
  home_team: g.homeTeam,
  away_team: g.awayTeam,
  poly_price: g.polyPrice,
  book_consensus: g.bookConsensus,
  edge_pct: (g.edge || 0) * 100,
  poly_volume: g.polyVolume,
  num_books: g.numBooks,
  tip_off_time: g.tipoff,
  hours_to_tipoff: ...,
  edge_team: g.polyTeam || g.awayTeam,
  signal: g.signal,
  book_lines: JSON.stringify(g.bookBreakdown),
  sport,
}));
// Upsert
await supabaseAdmin.from('edge_scans').upsert(rows, { onConflict: 'odds_api_game_id,game_date' });
```

---

### Phase 4: Settlement Edge Function

**New file: `supabase/functions/settle-games/index.ts`**

A new edge function that:

1. Queries `edge_scans` for rows where `result IS NULL` and `game_date < today`
2. Fetches scores from The Odds API: `GET /v4/sports/{sport}/scores/?apiKey={key}&daysFrom=2`
3. For each unsettled game, finds the matching score by `odds_api_game_id`
4. Determines winner, sets `result = 'win'/'loss'`, `edge_team_won`, `settled_at`
5. Updates the rows

This function can be called manually from the UI or scheduled via pg_cron.

**Add to `supabase/config.toml`:**
```toml
[functions.settle-games]
verify_jwt = false
```

**Add to `src/lib/api.ts`:**
```typescript
export async function settleGames(oddsApiKey: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("settle-games", {
    body: { oddsApiKey },
  });
  if (error) throw new Error(error.message);
  return data;
}
```

---

### Phase 5: Edge Tracker UI

**New file: `src/pages/EdgeTracker.tsx`**

A new page at `/tracker` with:

- **Summary cards**: Total tracked, Settled, Pending, Win Rate, Today's Edges
- **Performance table**: Edge bucket breakdown (5%+, 3-5%, 1-3%, <1%) with win rate and ROI
- **Recent results table**: Last 20 settled games with game, edge, prices, result indicator
- **Settle button**: Calls the settle-games function

**New file: `src/components/EdgePerformanceTable.tsx`**
- Reads from `edge_performance` view via Supabase client
- Displays the bucket table with color coding

**New file: `src/components/RecentResults.tsx`**
- Queries `edge_scans` where `result IS NOT NULL` ordered by `settled_at DESC LIMIT 20`
- Shows win/loss with green check / red X

**File: `src/App.tsx`**
- Add route: `<Route path="/tracker" element={<EdgeTracker />} />`

**File: `src/pages/Index.tsx`**
- Add a nav link to "/tracker" in the header

---

### Phase 6: UI Polish

**6a. Full school names (already partially done)**

The `formatTeamWithRank` function currently returns `abbr || team`. When `abbr` is an ESPN abbreviation like "GASO", it's cryptic. Change to prefer full team name (e.g., "Georgia Southern") truncated with CSS.

**File: `src/lib/polyedge.ts`** -- Update `formatTeamWithRank`:
```typescript
export function formatTeamWithRank(team: string, rank: number | null, abbr?: string): string {
  return rank ? `#${rank} ${team}` : team;
}
```

Always use full team name, rely on CSS `truncate` for overflow.

**6b. Volume filter UI**

**File: `src/components/GameTable.tsx`** -- Add a volume filter dropdown next to the "Hide fair-priced" checkbox:
- Options: All, $1K+, $5K+, $10K+
- Dim rows below threshold instead of hiding (opacity-50)

**6c. Live game indicator**

Already handled: the edge function filters out games where tipoff is in the past (line 405). No further change needed.

**6d. Auto-refresh defaults**

Already done in previous change: `DEFAULT_SETTINGS.autoScan = true`, `scanFrequency = 1`.

**6e. Book count display**

Already done: Shows `61.1% (4)` format in the Books % column.

---

### Summary of All Changes

| # | File | What |
|---|------|------|
| 1 | `supabase/functions/scan-games/index.ts` | More aliases, better alias matching, edge logging to DB |
| 2 | Database migration | Create `edge_scans` table + `edge_performance` view |
| 3 | `supabase/functions/settle-games/index.ts` | New function to settle games with scores API |
| 4 | `src/pages/EdgeTracker.tsx` | New Edge Tracker page |
| 5 | `src/components/EdgePerformanceTable.tsx` | Performance bucket table component |
| 6 | `src/components/RecentResults.tsx` | Recent settled results component |
| 7 | `src/App.tsx` | Add /tracker route |
| 8 | `src/pages/Index.tsx` | Add nav link to tracker |
| 9 | `src/lib/api.ts` | Add `settleGames()` API function |
| 10 | `src/lib/polyedge.ts` | Always use full team name |
| 11 | `src/components/GameTable.tsx` | Volume filter dropdown |
| 12 | `src/types/polyedge.ts` | No changes needed (types already include edgeConfidence, numBooks) |

