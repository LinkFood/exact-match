# PolyEdge — Architecture Document

## What It Does
PolyEdge is a sports betting edge scanner that cross-references Polymarket prediction market prices against sportsbook odds (DraftKings, FanDuel, BetMGM, ESPN Bet) to surface pricing discrepancies (edges) on NCAAB, NBA, and NFL games. It tracks historical edge performance and alerts via Slack when edges exceed a configurable threshold.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, ShadCN/Radix UI, Recharts
- **State:** React local state (useState/useEffect/useCallback/useRef), TanStack React Query (EdgeTracker), localStorage for settings
- **Backend:** Supabase (Postgres + Edge Functions on Deno)
- **External APIs:** The Odds API, Polymarket Gamma API, Polymarket CLOB API, ESPN Scoreboard API, Slack Webhooks
- **Testing:** Vitest + Testing Library
- **Hosting:** Lovable (Vite-based deploy)

## Directory Structure

```
src/
├── main.tsx              Entry point
├── App.tsx               Router: "/" → Index, "/tracker" → EdgeTracker
├── pages/
│   ├── Index.tsx         Main scanner — scan loop, state, auto-scan, Slack dispatch
│   ├── EdgeTracker.tsx   Historical performance + settle trigger
│   └── NotFound.tsx
├── components/
│   ├── GameTable.tsx     Sortable/filterable game rows
│   ├── ExpandedRow.tsx   Detail view (price chart + book breakdown)
│   ├── Sparkline.tsx     24hr CLOB price chart (Recharts)
│   ├── SportTabs.tsx     NCAAB / NBA / NFL tabs
│   ├── StatusBar.tsx     Scan status, countdown, credits
│   ├── SettingsPanel.tsx Settings drawer
│   ├── UnmatchedSection  Unmatched Poly/books games
│   ├── EdgePerformanceTable.tsx  Win rate by edge bucket
│   ├── RecentResults.tsx Settled games
│   └── NavLink.tsx
├── hooks/
│   ├── use-toast.ts
│   └── use-mobile.tsx
├── lib/
│   ├── api.ts            Edge function invokers
│   ├── polyedge.ts       Settings load/save, format helpers
│   └── utils.ts          clsx/tailwind-merge
├── types/
│   └── polyedge.ts       All domain types (single source of truth)
└── integrations/supabase/
    ├── client.ts          Supabase client
    └── types.ts           Generated DB types

supabase/
├── functions/
│   ├── scan-games/       On-demand scan (user-triggered, single sport)
│   ├── scan-edges/       Scheduled cron scan (all sports, odds caching, Slack alerts)
│   ├── price-history/    Proxies Polymarket CLOB price history
│   ├── settle-games/     Settles edge_scans via Odds API scores
│   └── send-slack-alert/ Single Slack alert sender
└── migrations/
    ├── 20260221200317    edge_scans table + edge_performance view
    ├── 20260221200644    RLS: service-role writes, SECURITY INVOKER view
    └── 20260221203721    cached_odds, scan_meta, alert_log tables
```

## Key Files
| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | All scan state, auto-scan interval, Slack alert dispatch |
| `src/types/polyedge.ts` | Single source of truth for all domain types |
| `src/lib/api.ts` | Thin wrappers around all 4 edge function calls |
| `supabase/functions/scan-games/index.ts` | Core matching: ESPN + Polymarket + Odds API → GameData |
| `supabase/functions/scan-edges/index.ts` | Cron scanner with odds caching, DB upsert, dedup alerts |
| `supabase/functions/settle-games/index.ts` | Settles past games via Odds API scores |

## Data Flow
1. `doScan(sport)` → calls `scan-games` edge function
2. Edge function fetches ESPN, Polymarket Gamma, Odds API in parallel
3. Fuzzy-matches Odds API games to Polymarket events via school-name normalization
4. Calculates edge = `bookConsensus - polyPrice`; signal = BUY_YES / BUY_NO / FAIR (±2%)
5. Upserts matched games to `edge_scans` table
6. Returns `ScanResult` → `Index.tsx` renders sorted by |edge|
7. Auto-scan repeats on interval; Slack alerts fire for qualifying edges

## Data Model

### edge_scans (primary)
Key columns: game_date, home_team, away_team, poly_price, book_consensus, edge_pct, poly_volume, edge_team, signal, book_lines (JSONB), result (win/loss/null), edge_team_won, sport

### edge_performance (view)
Groups settled edge_scans into buckets (<1%, 1-3%, 3-5%, 5%+) with win rate, avg edge, avg volume.

### cached_odds — Odds API response cache per sport (refreshed every 30 min)
### scan_meta — Tracks last_odds_fetch timestamp per sport
### alert_log — Deduplicates Slack alerts (unique on poly_event_id + alert_date)

## Conventions
- All domain types in `src/types/polyedge.ts` — no inline interfaces
- Edge functions are standalone Deno scripts; normalization logic is copied per function (not shared)
- School-name matching: mascot stripping → normalization → alias lookup
- Polymarket price = away team perspective; bookConsensus = away team implied probability
- edge_pct stored as percentage points (4.5 = 4.5%), not decimal
- No user auth — Supabase anon key for reads, service role for writes
- Settings persisted to localStorage under `polyedge-settings`

## Environment Variables

### Frontend (VITE_ prefix)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key

### Edge Functions (Deno env / Supabase dashboard)
- `SUPABASE_URL` — auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Supabase
- `ODDS_API_KEY` — for scheduled scanner
- `SLACK_WEBHOOK_URL` — optional, enables Slack alerts

## Ground Rules
- Built with Lovable — follows Lovable conventions
- No new external dependencies without discussion
- Domain types stay in `src/types/polyedge.ts`
- Edge functions stay self-contained (no shared imports between functions)
