

## Smart Auto-Scan: Server-Side Scanning with pg_cron

### Overview

Move scanning from browser-only to server-side using a new `scan-edges` Edge Function triggered by pg_cron every 5 minutes. Odds API data is cached and refreshed every 30 minutes to conserve credits (~48 calls/day instead of ~288). Slack alerts fire automatically from the server even when the browser is closed.

### Prerequisites: Store Secrets

The Odds API key and Slack webhook URL are currently in localStorage (browser-only). For server-side scanning, they must be stored as backend secrets so the Edge Function can access them.

You will be prompted to enter:
- **ODDS_API_KEY** -- your The Odds API key
- **SLACK_WEBHOOK_URL** -- your Slack incoming webhook URL

---

### Phase 1: New Database Tables

Three new tables via migration:

**`cached_odds`** -- Stores the latest Odds API response so the 5-minute Polymarket scans can reuse it without burning credits.

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT PK | Sport key (e.g. "ncaab") |
| data | JSONB | Full Odds API response |
| fetched_at | TIMESTAMPTZ | When this cache was written |

**`scan_meta`** -- Tracks when the last odds fetch happened per sport.

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT PK | Sport key |
| last_odds_fetch | TIMESTAMPTZ | Timestamp of last Odds API call |

**`alert_log`** -- Deduplicates Slack alerts so the same edge doesn't spam.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Auto-generated |
| poly_event_id | TEXT | Polymarket event |
| alert_date | DATE | Day of alert |
| last_edge | DECIMAL | Edge % when last alerted |
| alerted_at | TIMESTAMPTZ | When alert was sent |
| UNIQUE | (poly_event_id, alert_date) | Prevents duplicates |

All tables get RLS enabled with service-role-only write access and public read.

---

### Phase 2: New Edge Function `scan-edges`

**File: `supabase/functions/scan-edges/index.ts`**

A self-contained server-side scanner that:

1. Reads `ODDS_API_KEY` and `SLACK_WEBHOOK_URL` from environment secrets
2. Loops through all sports (ncaab, nba, nfl)
3. For each sport:
   - Always fetches fresh Polymarket data (free, no rate limits)
   - Checks `scan_meta` to see if odds data is stale (>30 min)
   - If stale: fetches fresh Odds API data, saves to `cached_odds`
   - If fresh: reads from `cached_odds` cache
4. Runs the same matching and edge calculation logic as `scan-games`
5. Upserts all matched games to `edge_scans`
6. For edges meeting threshold (3%+ and $1K+ volume):
   - Checks `alert_log` for duplicates
   - Sends Slack webhook if new or edge moved 1%+
   - Logs to `alert_log`

The matching logic (normalizeSchoolName, extractSchoolName, getSchoolKey, MASCOT_SUFFIXES, SCHOOL_ALIASES) is duplicated from `scan-games` into this function since edge functions cannot share code across files.

**Config: `supabase/config.toml`**
```
[functions.scan-edges]
verify_jwt = false
```

---

### Phase 3: pg_cron Schedule

Enable `pg_cron` and `pg_net` extensions, then schedule the function to run every 5 minutes:

```sql
SELECT cron.schedule(
  'scan-edges-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://isrtocpwtrhaedusiuct.supabase.co/functions/v1/scan-edges',
    headers := '{"Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);
```

This runs via SQL insert (not migration) since it contains project-specific values.

---

### Phase 4: Client-Side Updates

**File: `src/pages/Index.tsx`**

- Keep client-side auto-refresh for live dashboard updates
- Add a "Server scanning active" indicator in the status bar showing the cron is running independently

**File: `src/components/StatusBar.tsx`**

- Add a green dot + "Server scanning active" label to indicate 24/7 background scanning is enabled

**File: `src/components/SettingsPanel.tsx`**

- Add note under Slack webhook: "Alerts run server-side every 5 minutes, even when browser is closed"
- Add configurable alert thresholds (min edge %, min volume) -- these are stored in `scan_meta` or as secrets

---

### Summary of All Changes

| # | File/Resource | What |
|---|--------------|------|
| 1 | Secrets | Store ODDS_API_KEY and SLACK_WEBHOOK_URL as backend secrets |
| 2 | Database migration | Create `cached_odds`, `scan_meta`, `alert_log` tables |
| 3 | `supabase/functions/scan-edges/index.ts` | New server-side scanner with caching + alerts |
| 4 | `supabase/config.toml` | Add `scan-edges` function config |
| 5 | pg_cron SQL | Schedule every-5-minute scan |
| 6 | `src/components/StatusBar.tsx` | Server scanning indicator |
| 7 | `src/components/SettingsPanel.tsx` | Server-side alert info text |

### Credit Usage

- Odds API: ~48 calls/day (every 30 min x 24h) per sport enabled
- With 3 sports: ~144 calls/day, sustainable with 500 monthly credits for ~3.5 days
- With 1 sport (ncaab): ~48 calls/day, sustainable for ~10 days per month
- Polymarket: unlimited, no cost

