

## Apply Remaining Migration and Fix Cron Auth

### What's Already Done (no action needed)
- `edge_pct` column already widened to DECIMAL(7,3)
- Both cron jobs registered and active
- `ODDS_API_KEY` and `SLACK_WEBHOOK_URL` secrets are set
- Migration 4 (GUC variables) is NOT needed -- the cron jobs have URLs hardcoded, and `ALTER DATABASE` is blocked in Lovable Cloud anyway

### Step 1: Apply the edge_performance view fix

Run migration 5 to recreate the `edge_performance` view with push exclusion logic. This drops and recreates the view so pushes (ties) are excluded from loss counts and win rate calculations.

```sql
DROP VIEW IF EXISTS public.edge_performance;
CREATE VIEW public.edge_performance WITH (security_invoker = true) AS
SELECT
  CASE
    WHEN ABS(edge_pct) >= 5 THEN '5%+'
    WHEN ABS(edge_pct) >= 3 THEN '3-5%'
    WHEN ABS(edge_pct) >= 1 THEN '1-3%'
    ELSE '<1%'
  END AS edge_bucket,
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
GROUP BY edge_bucket
ORDER BY CASE
  WHEN ABS(edge_pct) >= 5 THEN 1
  WHEN ABS(edge_pct) >= 3 THEN 2
  WHEN ABS(edge_pct) >= 1 THEN 3
  ELSE 4
END;
```

### Step 2: Fix cron jobs to use service role key

The current cron jobs use the **anon key** for authorization. The edge functions `scan-edges` and `settle-games` need to write to the database using `supabaseAdmin` (service role), but the RLS policies on `edge_scans` require `service_role`. The anon key won't pass those policy checks when the function tries to insert/update rows.

We need to update both cron jobs to use the service role key instead:

```sql
-- Update scan-edges cron to use service role key
SELECT cron.unschedule('scan-edges-every-5-min');
SELECT cron.schedule(
  'scan-edges-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://isrtocpwtrhaedusiuct.supabase.co/functions/v1/scan-edges',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- Update settle-games cron to use service role key
SELECT cron.unschedule('settle-games-daily');
SELECT cron.schedule(
  'settle-games-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://isrtocpwtrhaedusiuct.supabase.co/functions/v1/settle-games',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

Note: The service role key will be pulled from the existing secret. The edge functions already use `SUPABASE_SERVICE_ROLE_KEY` internally to create the admin client, so the auth header just needs to pass the invoke check.

Actually -- looking more carefully, the edge functions use `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` internally to create `supabaseAdmin`. The Authorization header on the HTTP call only determines the `req` auth context, not the internal admin client. So the anon key should work fine for invoking the function -- the function itself escalates to service role internally. **No cron change needed.**

### Step 3: Verify everything works

After applying the view migration:
1. Trigger a manual scan from the app to confirm games load with edges
2. Check that the Edge Tracker page loads without errors
3. Manually invoke `settle-games` to settle any past games (all 98 currently unsettled)
4. After settlement, check the `edge_performance` view returns data

### Summary

| Action | Status |
|--------|--------|
| Migration 4 (GUC variables) | SKIP -- not needed, blocked by Cloud |
| Migration 5 (fix view) | APPLY via migration tool |
| Widen edge_pct | Already done |
| Cron jobs | Active, auth is fine (functions use internal service role) |
| Secrets | All set |
| Settlement | Trigger manually to populate performance data |

