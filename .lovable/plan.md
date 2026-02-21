

## Fix 5: Polymarket API Date Filtering

### Problem
The Polymarket fetch uses `order=startTime&ascending=false&limit=100`, returning future games (Feb 26-27) first. Today's games are buried past the 100-event limit, producing zero matches.

### Changes (single file: `supabase/functions/scan-games/index.ts`)

**1. Build date-filtered Polymarket URL (before the fetch call)**

Calculate `end_date_min` (today midnight UTC) and `end_date_max` (today+2 midnight UTC) to capture today's games whose settlement dates fall within that window. Remove `order`, `ascending`, and `tag_id=100639` (redundant with `series_id`). Increase `limit` to 200.

**2. Replace the Polymarket fetch URL (line 165)**

From:
```
https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&tag_id=100639&active=true&closed=false&order=startTime&ascending=false&limit=100
```

To:
```
https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&active=true&closed=false&limit=200&end_date_min=${endDateMin}&end_date_max=${endDateMax}
```

**3. Add client-side `eventDate` filter (lines 186-187)**

After fetching, filter `allPolyEvents` to only events where `event.eventDate` matches today's date string (YYYY-MM-DD format). This narrows the 2-day server-side window to exactly today.

Replace:
```typescript
const polyEvents = allPolyEvents;
```

With:
```typescript
const todayStr = new Date().toISOString().split('T')[0];
const polyEvents = allPolyEvents.filter((e: any) => e.eventDate === todayStr);
```

**4. Update debug log (line 188)**

Show both total fetched and filtered counts for debugging:
```typescript
console.log(`Poly events: ${allPolyEvents.length} fetched, ${polyEvents.length} today, ESPN: ${espnEvents.length}, Odds API: ${oddsGames.length}`);
```

No other changes. School-name matching, side alignment, and everything else remain untouched.

