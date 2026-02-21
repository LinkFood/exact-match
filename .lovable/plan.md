

## Two Fixes for scan-games Edge Function

### Fix 1: Update NCAAB series_id

Change `seriesId` from `"39"` (March Madness tournament, currently empty) to `"10470"` (regular season college basketball) in the `SPORT_CONFIG` object.

### Fix 2: Filter table to Polymarket-matched games only

The current logic iterates over all Odds API games and includes every one in the `games` array regardless of whether a Polymarket match exists. This produces 148 rows of mostly empty data for NCAAB.

The fix: after the main matching loop, only push games into the `games` array when `polyMatch` was found (i.e., `matchConfidence !== "none"`). Games with no Polymarket match get added to the `unmatched.booksOnly` list instead.

Specifically, in the loop body where `games.push(...)` is called, wrap it in a conditional:
- If `polyMatch` exists, push to `games` array (these appear in the table)
- If no `polyMatch`, push to a new `unmatchedBooks` collector array (these appear in the unmatched section)

This ensures only actionable rows with both Polymarket and sportsbook data appear in the main table, matching the behavior already seen on the NBA tab when it has good data.

### Technical Details

Single file change: `supabase/functions/scan-games/index.ts`

1. Line 15: Change `seriesId: "39"` to `seriesId: "10470"`
2. Around lines 195-300 (the main loop): Add a condition so that only games with a Polymarket match are pushed to the `games` array. Unmatched Odds API games go into the `booksOnly` unmatched list.
3. Simplify the existing `booksOnly` computation at the end since it will now be built during the loop.

No frontend or type changes needed -- the response shape remains identical.

