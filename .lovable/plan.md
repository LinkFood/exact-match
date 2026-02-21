

## NCAAB Data Integrity: Date Filter, School Name Matching, Side Alignment

Three critical bugs are producing garbage data in the NCAAB tab: zombie markets from months ago, mascot-collision matches, and inverted price sides. This plan rewrites the matching and pricing logic in `scan-games/index.ts`.

### Fix 1: Date Filter -- Kill Zombie Markets

The Polymarket Gamma API returns stale events (e.g. November 2025 games) as "active". These dead markets at 5c get matched to today's live games, creating fake 75% edges.

**Changes:**
- Change Polymarket fetch order from `ascending=true` to `ascending=false` (newest first)
- After fetching, filter `polyEvents` to only include events whose `endDate` (or `startDate` fallback) falls on today's date
- Log the filtered count for debugging

### Fix 2: School Name Matching (Replace Mascot-Based System)

The entire `TEAM_ALIASES` map and `normalizeTeamName()` function get replaced with a school-name extraction approach. "Eagles", "Tigers", "Wildcats" etc. are shared by 5-10+ schools and cause false matches.

**Changes:**
- Add a `MASCOT_SUFFIXES` array (multi-word first, then single-word) used to strip mascots from full team names
- Add `extractSchoolName()` that removes the mascot suffix, returning just the school name (e.g. "Kansas State Wildcats" -> "kansas state")
- Add a small `SCHOOL_ALIASES` map for abbreviation normalization (e.g. "uconn" -> "connecticut", "ole miss" -> "mississippi", "st. john's" -> "st johns")
- Add `normalizeSchoolName()` that applies aliases after extraction
- Replace the Polymarket matching loop: split title on "vs.", extract both school names, compare against both Odds API team school names
- Keep the existing `TEAM_ALIASES` + `normalizeTeamName()` for NBA/NFL matching (where mascot names are unique) -- only use school-name matching for NCAAB, or use it universally since it works for all sports
- Also update ESPN matching to use the same school-name approach

### Fix 3: Side Alignment -- Correct Team-to-Price Mapping

Currently `outcomePrices[0]` is blindly assigned as the poly price without checking which team it represents. The first outcome corresponds to the first-named team in the Polymarket title, which may not match the Odds API away team.

**Changes:**
- After finding a Polymarket match, determine which Poly outcome corresponds to the Odds API away team (used for book consensus)
- Parse both `outcomePrices[0]` and `outcomePrices[1]`; map them to home/away using school name comparison
- Select the correct price and `clobTokenId` for the away team (which is what book consensus currently calculates)
- Update edge calculation to compare the correctly-aligned poly price against book consensus
- Ensure `polyTeam` label matches the team whose price is displayed

### Technical Details

**Single file change:** `supabase/functions/scan-games/index.ts`

The file will be substantially rewritten:

1. **Lines 30-145** (TEAM_ALIASES + normalizeTeamName): Replace with `MASCOT_SUFFIXES`, `SCHOOL_ALIASES`, `extractSchoolName()`, and `normalizeSchoolName()`. Keep `TEAM_ALIASES` + `normalizeTeamName()` only if needed for ESPN matching fallback.

2. **Line 173**: Change `ascending=true` to `ascending=false` in Polymarket fetch URL.

3. **Lines 190-196**: After parsing `polyEvents`, add date filter to remove events not scheduled for today. Log filtered count.

4. **Lines 208-240** (Polymarket matching loop): Replace mascot-based `title.includes()` matching with school-name extraction and comparison using `extractSchoolName()` + `normalizeSchoolName()`.

5. **Lines 257-273** (book consensus): Keep as-is but ensure we know which team (home vs away) the consensus is for.

6. **Lines 281-303** (Polymarket data parsing): Add side alignment logic. Compare school names from Poly title against Odds API home/away to determine which `outcomePrices` index and `clobTokenIds` index to use.

7. **Lines 305-324** (edge calculation): Use the correctly-aligned poly price for edge computation.

**No frontend or type changes needed** -- the response shape (`GameData`, `ScanResult`) remains identical.

### Expected Outcome

After deployment, NCAAB tab should show ~10-30 rows of today's games only, with prices like:
- Wake Forest vs Virginia Tech: Poly ~37c vs Books ~38%
- Kansas State vs Texas Tech: Poly ~14c vs Books ~14%
- Creighton vs St. John's: Poly ~12c vs Books ~12%

Any edge greater than +/-15% should be rare and legitimate rather than a data artifact.

