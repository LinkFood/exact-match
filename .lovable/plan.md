

## Fix Polymarket API Query in scan-games Edge Function

The Polymarket API uses `series_id` (not `tag`) to filter events by sport league. The current `tag` parameter returns unrelated events (crypto, politics), breaking the matching logic.

### Changes (single file: `supabase/functions/scan-games/index.ts`)

1. **Update `SPORT_CONFIG`** -- Replace `polyTag` with `seriesId` for each sport:
   - ncaab: `seriesId: "39"`
   - nba: `seriesId: "10345"`
   - nfl: `seriesId: "10187"`

2. **Update Polymarket fetch URL** -- Change from `tag=${config.polyTag}` to `series_id=${config.seriesId}&tag_id=100639&active=true&closed=false&order=startTime&ascending=true&limit=100`

3. **Add debug logging** -- After parsing ESPN, Polymarket, and Odds API responses, log event counts and titles/matchups so matching issues are visible in the backend function logs.

### Technical Details

All changes are confined to the `scan-games` edge function. No frontend or type changes needed since the response shape stays the same.

