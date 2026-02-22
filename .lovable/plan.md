

## Fix Build Errors and Apply Remaining Migrations

### 1. Fix TypeScript build errors (all 5 edge functions)

Each function has a `catch (error)` block that accesses `error.message` without typing. Fix by changing to `catch (error: any)` or casting in all 5 files:

- `supabase/functions/price-history/index.ts` (line 33)
- `supabase/functions/scan-edges/index.ts` (line 449)
- `supabase/functions/scan-games/index.ts` (line 537)
- `supabase/functions/send-slack-alert/index.ts` (line 60)
- `supabase/functions/settle-games/index.ts` (line 246)

### 2. Apply column widening migration

Run SQL to widen `edge_pct` from `DECIMAL(5,3)` to `DECIMAL(7,3)`:

```sql
ALTER TABLE edge_scans ALTER COLUMN edge_pct TYPE DECIMAL(7,3);
```

### 3. Add settle-games daily cron job

Schedule `settle-games` to run daily at 6 AM UTC. This uses hardcoded project URL and anon key (since `current_setting()` is not available):

```sql
SELECT cron.schedule(
  'settle-games-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://isrtocpwtrhaedusiuct.supabase.co/functions/v1/settle-games',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### 4. Skip duplicate migration

Migration `20260222000002_pg_cron_scan_edges.sql` is already applied -- the `scan-edges-every-5-min` cron job is already running. This migration will be skipped to avoid conflicts.

### Summary

| Step | What | Method |
|------|------|--------|
| 1 | Fix `error.message` type errors in 5 edge functions | Code edit (`catch (error: any)`) |
| 2 | Widen `edge_pct` column | SQL migration |
| 3 | Schedule settle-games daily cron | SQL insert (project-specific) |
| 4 | Skip scan-edges cron migration | Already active |

