

## Remove Date Filter from scan-games Edge Function

The date filter (lines 186-197) is filtering out ALL Polymarket events because `endDate` is the market settlement date, not the game date. A game on Feb 21 may have an `endDate` of Feb 22 or later, so the filter kills every result.

The school-name matching (Fix 2) already prevents zombie market collisions -- stale events from months ago won't match any current Odds API game.

### Changes (single file: `supabase/functions/scan-games/index.ts`)

1. **Remove the date filter block** (lines 186-197): Delete the `today`/`tomorrow` date logic and the `.filter()` call. Replace with `const polyEvents = allPolyEvents;`

2. **Simplify the debug log** (line 199): Change to `console.log(\`Poly events: ${polyEvents.length}, ESPN: ${espnEvents.length}, Odds API: ${oddsGames.length}\`);` and remove the separate ESPN/Odds log lines (200-201) since they're now consolidated.

No other changes. All school-name matching, side alignment, and the rest of the function remain untouched.

