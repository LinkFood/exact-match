

## Diagnose and Fix Empty Odds API Response

### Problem
The Odds API returns 0 games despite the `ODDS_API_KEY` being set. Both `scan-games` and `scan-edges` silently swallow API errors, making it impossible to tell if the key is invalid, expired, or out of credits.

### Step 1: Add debug logging to `scan-games`
In `supabase/functions/scan-games/index.ts`, modify the Odds API fetch (around line 242) to log the HTTP status code and response body when no games are returned:

```typescript
// Change the odds fetch to log status and error details
oddsApiKey
  ? fetch(...)
      .then(async (r) => {
        const remaining = r.headers.get("x-requests-remaining");
        const data = await r.json();
        if (!r.ok) {
          console.error(`Odds API error: status=${r.status}, body=${JSON.stringify(data)}`);
        }
        console.log(`Odds API: status=${r.status}, remaining=${remaining}, games=${Array.isArray(data) ? data.length : 'not-array'}`);
        return { data: r.ok ? data : [], creditsRemaining: remaining ? parseInt(remaining) : null };
      })
```

### Step 2: Add debug logging to `scan-edges`
In `supabase/functions/scan-edges/index.ts`, similarly log the Odds API response status and body around line 175:

```typescript
const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/...`);
const oddsData = await oddsRes.json();
if (!oddsRes.ok) {
  console.error(`Odds API error for ${sport}: status=${oddsRes.status}, body=${JSON.stringify(oddsData)}`);
}
console.log(`Odds API ${sport}: status=${oddsRes.status}, games=${Array.isArray(oddsData) ? oddsData.length : 'not-array'}`);
```

### Step 3: Deploy and test
After deploying the updated functions, trigger a manual scan to see the actual Odds API response in the logs. This will reveal whether:
- The key is invalid (401 response)
- Credits are exhausted (402/429 response)
- The sport key is wrong (404 response)
- There are genuinely no games (200 with empty array)

### Step 4: Fix based on findings
- If the key is invalid/expired: update the secret with a valid key
- If credits are exhausted: the user needs to get more credits or wait for the monthly reset
- If the API returns data successfully: investigate the matching logic

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/scan-games/index.ts` | Add HTTP status + error body logging to Odds API fetch (lines 242-251) |
| `supabase/functions/scan-edges/index.ts` | Add HTTP status + error body logging to Odds API fetch (lines 170-180) |

No database changes needed. This is purely diagnostic logging to understand why the Odds API returns empty results.
