

## PolyEdge Improvements: Matching, Display, and Edge Quality

### PART 1: Matching Fixes (scan-games Edge Function)

**File: `supabase/functions/scan-games/index.ts`**

Rewrite `normalizeSchoolName()` (lines 130-133) to handle all the naming inconsistencies before alias lookup:

1. **"State" vs "St" vs "St."** -- Replace standalone `\bst\.?\b` with "state" (biggest single fix, ~15+ games)
2. **"Fightin'" prefix** -- Strip `fightin'` (Delaware case)
3. **Hyphens and extra spaces** -- Normalize `UMass-Lowell` to `umass lowell`
4. **Parenthetical qualifiers** -- Remove `(OH)`, `(FL)`, `(MD)`, `(NC)`, `(Chi)`
5. **"University" / "College"** -- Strip these words

Add new entries to `SCHOOL_ALIASES` (lines 80-116):
- `uncw` -> `unc wilmington`, `uncg` -> `unc greensboro`, `unca` -> `unc asheville`
- `siue` -> `siu edwardsville`, `umkc` -> `missouri kansas city`
- `penn` -> `pennsylvania`, `ul monroe` -> `louisiana monroe`
- `florida int'l` -> `florida international`, `se missouri` -> `southeast missouri`
- `app state` -> `appalachian state`, `sam houston st` -> `sam houston state`
- `loyola maryland` -> `loyola md` (and reverse mapping)

Add `"Black Knights"` to `MASCOT_SUFFIXES` so "Army Black Knights" extracts to "army" matching "Army Knights".

Expected impact: ~25-35 additional matched games.

---

### PART 2: Display Improvements

**2a. Show full school names instead of just mascots**

**File: `src/lib/polyedge.ts`** -- Change `formatTeamWithRank()` to show school name (everything before the mascot) instead of just the last word:

```
function formatTeamWithRank(team: string, rank: number | null, abbr?: string): string {
  const name = abbr || team;
  return rank ? `#${rank} ${name}` : name;
}
```

This shows full team names like "Georgia Southern Eagles" instead of just "Eagles".

**File: `src/components/GameTable.tsx`** -- The teams column already uses `formatTeamWithRank`, so this change propagates automatically. Truncation via `truncate` CSS class handles overflow.

**2b. Add Polymarket link to BUY/SELL signal badge**

**File: `src/components/GameTable.tsx`** -- Wrap the signal badge (the "BUY Eagles" span) in an anchor tag linking to `game.polyMarketUrl` with `target="_blank"`. Add click stopPropagation to prevent row expansion.

**2c. Show number of sportsbooks in Books % column**

**File: `src/components/GameTable.tsx`** -- Change the Book Consensus cell to show count: `61.1% (4)` using `game.bookBreakdown.length`.

**File: `src/types/polyedge.ts`** -- No changes needed; `bookBreakdown` array length already available.

---

### PART 3: Edge Quality Improvements

**3a. Edge confidence score**

**File: `supabase/functions/scan-games/index.ts`** -- After calculating edge, compute a confidence score:

```
confidence = |edge| * log10(max(volume, 1)) * sqrt(numBooks) * (1 / max(hoursToTip, 0.5))
```

Add `edgeConfidence: number | null` to the game object returned.

**File: `src/types/polyedge.ts`** -- Add `edgeConfidence: number | null` and `numBooks: number` to `GameData`.

**File: `src/components/GameTable.tsx`** -- Add a confidence indicator (low/med/high) next to the edge value, and add `numBooks` to the response.

**3b. Filter out live/in-progress games**

**File: `supabase/functions/scan-games/index.ts`** -- After building the games list, filter out games where `tipoff` is in the past. Compare `new Date(tipoff) < new Date()`.

**3c. Auto-refresh default**

**File: `src/types/polyedge.ts`** -- Change `DEFAULT_SETTINGS.autoScan` from `false` to `true` and `scanFrequency` from `30` to `1` (1 minute).

---

### Summary of Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/scan-games/index.ts` | Enhanced `normalizeSchoolName()`, expanded `SCHOOL_ALIASES`, added "Black Knights" mascot, confidence score, filter live games |
| `src/types/polyedge.ts` | Added `edgeConfidence`, `numBooks` to `GameData`; changed default autoScan/scanFrequency |
| `src/lib/polyedge.ts` | Updated `formatTeamWithRank()` to show full name |
| `src/components/GameTable.tsx` | Full names, book count display, Polymarket link on signal badge, confidence indicator |

