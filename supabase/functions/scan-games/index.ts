import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SPORT_CONFIG: Record<
  string,
  { espn: string; oddsKey: string; seriesId: string }
> = {
  ncaab: {
    espn: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
    oddsKey: "basketball_ncaab",
    seriesId: "10470",
  },
  nba: {
    espn: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    oddsKey: "basketball_nba",
    seriesId: "10345",
  },
  nfl: {
    espn: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    oddsKey: "americanfootball_nfl",
    seriesId: "10187",
  },
};

// ── Mascot suffixes for school-name extraction (multi-word first) ──
const MASCOT_SUFFIXES = [
  "Demon Deacons", "Blue Devils", "Tar Heels", "Red Storm", "Red Raiders",
  "Golden Eagles", "Runnin' Rebels", "Running Rebels", "Screaming Eagles",
  "Yellow Jackets", "Nittany Lions", "Crimson Tide", "Fighting Irish",
  "Golden Gophers", "Horned Frogs", "Scarlet Knights", "Mean Green",
  "Red Foxes", "Blue Hens", "Fightin' Blue Hens", "Golden Grizzlies", "River Hawks",
  "Great Danes", "Black Bears", "Purple Aces", "Ragin' Cajuns",
  "Fighting Illini", "Fighting Hawks", "Golden Flashes", "Blue Hose",
  "Runnin' Bulldogs", "Red Flash", "Golden Panthers", "Blue Raiders",
  "Trail Blazers", "Black Knights",
  // Single-word
  "Aggies", "Anteaters", "Aztecs", "Badgers", "Bears", "Bearcats", "Beavers",
  "Bengals", "Billikens", "Bison", "Blazers", "Boilermakers", "Bonnies",
  "Braves", "Bruins", "Buckeyes", "Buccaneers", "Bulldogs", "Bulls",
  "Cardinals", "Catamounts", "Cavaliers", "Celtics", "Chanticleers",
  "Chargers", "Chiefs", "Clippers", "Colonials", "Colonels", "Colts", "Commanders",
  "Commodores", "Cougars", "Cowboys", "Crimson", "Crusaders", "Cyclones",
  "Dolphins", "Dons", "Dragons", "Ducks", "Dukes",
  "Eagles", "Engineers", "Explorers",
  "Falcons", "Flames", "Flyers", "Friars",
  "Gaels", "Gators", "Giants", "Governors", "Grizzlies",
  "Hatters", "Hawks", "Highlanders", "Hilltoppers", "Hokies", "Hoosiers",
  "Hornets", "Huskies",
  "Islanders",
  "Jaguars", "Jayhawks", "Jays", "Jets",
  "Kangaroos", "Kings", "Knicks", "Knights",
  "Lakers", "Lancers", "Leathernecks", "Leopards", "Lions", "Lobos", "Longhorns", "Lumberjacks",
  "Magic", "Mastodons", "Mavericks", "Miners", "Mocs", "Monarchs",
  "Mountaineers", "Musketeers", "Mustangs",
  "Nets", "Norse", "Nuggets",
  "Ospreys", "Owls",
  "Pacers", "Packers", "Paladins", "Panthers", "Patriots", "Peacocks",
  "Pelicans", "Penguins", "Phoenix", "Pilots", "Pioneers", "Pirates",
  "Pistons", "Pride", "Privateers",
  "Racers", "Raiders", "Rams", "Raptors", "Rattlers", "Ravens",
  "Razorbacks", "Rebels", "Retrievers", "Roadrunners", "Rockets", "Royals",
  "Salukis", "Saints", "Seahawks", "Seawolves", "Seminoles", "Shockers",
  "Skyhawks", "Sooners", "Spartans", "Spiders", "Spurs", "Stags",
  "Steelers", "Suns", "Sycamores",
  "Terps", "Terrapins", "Terriers", "Texans", "Thunder", "Thunderbirds",
  "Tigers", "Timberwolves", "Titans", "Tommies", "Toreros", "Trojans",
  "Utes", "Vandals", "Vikings", "Volunteers", "Vulcans",
  "Warhawks", "Warriors", "Waves", "Wildcats", "Wizards", "Wolfpack",
  "Wolverines", "Wolves",
  "Zags", "Zips",
  "Heat", "Jazz", "76ers",
  "Roos",
];

const SCHOOL_ALIASES: Record<string, string> = {
  "uconn": "connecticut",
  "ole miss": "mississippi",
  "lsu": "louisiana state",
  "smu": "southern methodist",
  "tcu": "texas christian",
  "ucf": "central florida",
  "unlv": "nevada las vegas",
  "utep": "texas el paso",
  "vcu": "virginia commonwealth",
  "fiu": "florida international",
  "florida int'l": "florida international",
  "fau": "florida atlantic",
  "unc": "north carolina",
  "pitt": "pittsburgh",
  "cal": "california",
  "usc": "southern california",
  "umass": "massachusetts",
  "uab": "alabama birmingham",
  "utsa": "texas san antonio",
  "siu": "southern illinois",
  "niu": "northern illinois",
  "wku": "western kentucky",
  "ecu": "east carolina",
  "jmu": "james madison",
  "odu": "old dominion",
  "byu": "brigham young",
  "st. john's": "state johns",
  "saint john's": "state johns",
  "st johns": "state johns",
  "saint mary's": "saint marys",
  "st. mary's": "saint marys",
  // Matching fix aliases
  "uncw": "unc wilmington",
  "uncg": "unc greensboro",
  "unca": "unc asheville",
  "siue": "siu edwardsville",
  "umkc": "missouri kansas city",
  "kansas city": "missouri kansas city",
  "penn": "pennsylvania",
  "ul monroe": "louisiana monroe",
  "se missouri": "southeast missouri",
  "southeastern missouri state": "southeast missouri state",
  "app state": "appalachian state",
  "loyola maryland": "loyola md",
  "loyola (md)": "loyola md",
  "queens (nc)": "queens",
  "queens university": "queens",
  "miami (fl)": "miami",
  "miami (oh)": "miami ohio",
  "sam houston state": "sam houston",
  "massachusetts lowell": "umass lowell",
  "ut arlington": "texas arlington",
  // NBA/NFL aliases
  "la lakers": "los angeles lakers",
  "la clippers": "los angeles clippers",
  "okc": "oklahoma city",
  "niners": "san francisco",
};

function extractSchoolName(fullName: string): string {
  let name = fullName.trim();
  const lower = name.toLowerCase();
  for (const mascot of MASCOT_SUFFIXES) {
    if (lower.endsWith(mascot.toLowerCase())) {
      name = name.substring(0, name.length - mascot.length).trim();
      break;
    }
  }
  return name.toLowerCase().trim();
}

function normalizeSchoolName(school: string): string {
  let n = school.toLowerCase().trim();

  // 1. CRITICAL: "st" / "st." → "state" (biggest single fix)
  n = n.replace(/\bst\.?\b/g, "state");

  // 2. Strip "fightin'" prefix
  n = n.replace(/\bfightin'?\s*/g, "");

  // 3. Hyphens → spaces, collapse whitespace
  n = n.replace(/-/g, " ").replace(/\s+/g, " ").trim();

  // 4. Remove parenthetical qualifiers like (OH), (FL)
  n = n.replace(/\([^)]*\)/g, "").trim();

  // 5. Strip "university" / "college"
  n = n.replace(/\buniversity\b/g, "").replace(/\bcollege\b/g, "").trim();

  // 6. Collapse whitespace again after removals
  n = n.replace(/\s+/g, " ").trim();

  // 7. Alias lookup — check exact match first, then startsWith for multi-word aliases
  if (SCHOOL_ALIASES[n]) return SCHOOL_ALIASES[n];
  for (const [key, val] of Object.entries(SCHOOL_ALIASES)) {
    if (n.startsWith(key + " ")) {
      n = val + n.substring(key.length);
      break;
    }
  }
  return n;
}

function getSchoolKey(fullTeamName: string): string {
  return normalizeSchoolName(extractSchoolName(fullTeamName));
}

function americanToImpliedProbability(odds: number): number {
  if (odds < 0) {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
  return 100 / (odds + 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sport, oddsApiKey } = await req.json();
    const config = SPORT_CONFIG[sport];
    if (!config) {
      return new Response(
        JSON.stringify({ error: "Invalid sport" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch all 3 APIs in parallel (newest Poly events first)
    // Calculate date range for Polymarket filtering
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endDateMin = today.toISOString();
    const twoDaysOut = new Date(today);
    twoDaysOut.setUTCDate(twoDaysOut.getUTCDate() + 2);
    const endDateMax = twoDaysOut.toISOString();

    const [espnRes, polyRes, oddsRes] = await Promise.all([
      fetch(config.espn).then((r) => r.json()).catch(() => ({ events: [] })),
      fetch(
        `https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&active=true&closed=false&limit=200&end_date_min=${endDateMin}&end_date_max=${endDateMax}`
      )
        .then((r) => r.json())
        .catch(() => []),
      oddsApiKey
        ? fetch(
            `https://api.the-odds-api.com/v4/sports/${config.oddsKey}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,espnbet`
          )
            .then(async (r) => {
              const remaining = r.headers.get("x-requests-remaining");
              const data = await r.json();
              return { data, creditsRemaining: remaining ? parseInt(remaining) : null };
            })
            .catch(() => ({ data: [], creditsRemaining: null }))
        : { data: [], creditsRemaining: null },
    ]);

    const espnEvents = espnRes.events || [];
    const allPolyEvents = Array.isArray(polyRes) ? polyRes : [];
    const oddsGames = Array.isArray(oddsRes.data) ? oddsRes.data : [];

    const todayStr = new Date().toISOString().split('T')[0];
    const polyEvents = allPolyEvents.filter((e: any) => e.eventDate === todayStr);

    console.log(`Poly events: ${allPolyEvents.length} fetched, ${polyEvents.length} today, ESPN: ${espnEvents.length}, Odds API: ${oddsGames.length}`);

    const games: any[] = [];
    const unmatchedBooks: string[] = [];
    const matchedPolyIds = new Set<string>();

    for (const oddsGame of oddsGames) {
      const oddsHomeKey = getSchoolKey(oddsGame.home_team);
      const oddsAwayKey = getSchoolKey(oddsGame.away_team);

      // ── Fix 2: School-name matching ──
      let polyMatch: any = null;
      for (const pe of polyEvents) {
        const title = pe.title || "";
        const vsSplit = title.split(/\s+vs\.?\s+/i);
        if (vsSplit.length !== 2) continue;

        const polySchool1 = getSchoolKey(vsSplit[0]);
        const polySchool2 = getSchoolKey(vsSplit[1]);

        const match1 = polySchool1 === oddsHomeKey && polySchool2 === oddsAwayKey;
        const match2 = polySchool1 === oddsAwayKey && polySchool2 === oddsHomeKey;

        if (match1 || match2) {
          polyMatch = pe;
          matchedPolyIds.add(pe.id);
          break;
        }
      }

      // Find matching ESPN event (also using school-name matching)
      let espnMatch: any = null;
      for (const ev of espnEvents) {
        const comps = ev.competitions?.[0]?.competitors || [];
        if (comps.length >= 2) {
          const keys = comps.map((c: any) =>
            getSchoolKey(c.team?.displayName || "")
          );
          if (keys.includes(oddsHomeKey) && keys.includes(oddsAwayKey)) {
            espnMatch = ev;
            break;
          }
        }
      }

      // Calculate book consensus (for away team)
      const bookBreakdown: any[] = [];
      for (const bm of oddsGame.bookmakers || []) {
        const h2h = bm.markets?.find((m: any) => m.key === "h2h");
        if (!h2h) continue;
        const awayOutcome = h2h.outcomes?.find(
          (o: any) => getSchoolKey(o.name) === oddsAwayKey
        );
        if (awayOutcome) {
          bookBreakdown.push({
            book: bm.title,
            odds: awayOutcome.price,
            impliedProb: americanToImpliedProbability(awayOutcome.price),
          });
        }
      }

      const bookConsensus =
        bookBreakdown.length > 0
          ? bookBreakdown.reduce((sum: number, b: any) => sum + b.impliedProb, 0) /
            bookBreakdown.length
          : 0;

      // ── Fix 3: Side alignment — correct team-to-price mapping ──
      let polyPrice: number | null = null;
      let polyTeam: string | null = null;
      let polyVolume: number | null = null;
      let polyMarketSlug: string | null = null;
      let clobTokenId: string | null = null;

      if (polyMatch && polyMatch.markets?.length > 0) {
        const market = polyMatch.markets[0];
        try {
          const prices = JSON.parse(market.outcomePrices || "[]");
          const tokens = JSON.parse(market.clobTokenIds || "[]");
          polyVolume = parseFloat(market.volume) || null;
          polyMarketSlug = polyMatch.slug || null;

          // Determine which outcome index corresponds to the away team
          const titleParts = (polyMatch.title || "").split(/\s+vs\.?\s+/i);
          if (titleParts.length === 2) {
            const polySchool1 = getSchoolKey(titleParts[0]);
            // polySchool1 = first team in Poly title → prices[0] / tokens[0]
            // polySchool2 = second team in Poly title → prices[1] / tokens[1]

            let awayIdx: number;
            if (polySchool1 === oddsAwayKey) {
              awayIdx = 0; // First Poly team IS the away team
            } else {
              awayIdx = 1; // Second Poly team is the away team
            }

            polyPrice = parseFloat(prices[awayIdx]) || null;
            clobTokenId = tokens[awayIdx] || null;
            polyTeam = titleParts[awayIdx]?.trim() || oddsGame.away_team;
          } else {
            // Fallback: can't parse title
            polyPrice = parseFloat(prices[0]) || null;
            clobTokenId = tokens[0] || null;
            polyTeam = oddsGame.away_team;
          }
        } catch {
          // parse errors
        }
      }

      // Calculate edge
      let edge: number | null = null;
      let edgePercent: string | null = null;
      let signal: string = "FAIR";
      let signalTeam: string | null = null;
      let signalExplanation: string | null = null;

      if (polyPrice !== null && bookConsensus > 0) {
        edge = bookConsensus - polyPrice;
        edgePercent = `${edge > 0 ? "+" : ""}${(edge * 100).toFixed(1)}%`;
        if (edge > 0.02) {
          signal = "BUY_YES";
          signalTeam = polyTeam;
          signalExplanation = `${polyTeam} YES at ${(polyPrice * 100).toFixed(0)}¢ vs books at ${(bookConsensus * 100).toFixed(1)}% — ${(edge * 100).toFixed(1)}% edge`;
        } else if (edge < -0.02) {
          signal = "BUY_NO";
          signalTeam = polyTeam;
          signalExplanation = `${polyTeam} YES at ${(polyPrice * 100).toFixed(0)}¢ vs books at ${(bookConsensus * 100).toFixed(1)}% — overpriced by ${(Math.abs(edge) * 100).toFixed(1)}%`;
        }
      }

      // Get ESPN data
      let homeRank = null;
      let awayRank = null;
      let homeAbbr = "";
      let awayAbbr = "";
      let tipoff = oddsGame.commence_time;

      if (espnMatch) {
        tipoff = espnMatch.date || tipoff;
        const comps = espnMatch.competitions?.[0]?.competitors || [];
        for (const c of comps) {
          const ck = getSchoolKey(c.team?.displayName || "");
          const rank = c.curatedRank?.current;
          const abbr = c.team?.abbreviation || "";
          if (ck === oddsHomeKey) {
            homeRank = rank && rank <= 25 ? rank : null;
            homeAbbr = abbr;
          } else if (ck === oddsAwayKey) {
            awayRank = rank && rank <= 25 ? rank : null;
            awayAbbr = abbr;
          }
        }
      }

      // Calculate edge confidence
      let edgeConfidence: number | null = null;
      const numBooks = bookBreakdown.length;
      if (edge !== null && polyVolume && numBooks > 0) {
        const hoursToTip = Math.max(
          (new Date(tipoff).getTime() - Date.now()) / 3600000,
          0.5
        );
        edgeConfidence =
          Math.abs(edge) *
          Math.log10(Math.max(polyVolume, 1)) *
          Math.sqrt(numBooks) *
          (1 / hoursToTip);
      }

      // Filter out live/in-progress games
      if (new Date(tipoff) < new Date()) continue;

      if (polyMatch) {
        games.push({
          id: oddsGame.id,
          matchConfidence: "high",
          sport,
          homeTeam: oddsGame.home_team,
          awayTeam: oddsGame.away_team,
          homeAbbr,
          awayAbbr,
          homeRank,
          awayRank,
          tipoff,
          polyPrice,
          polyTeam,
          polyVolume,
          polyMarketSlug,
          polyMarketUrl: polyMarketSlug
            ? `https://polymarket.com/event/${polyMarketSlug}`
            : null,
          clobTokenId,
          bookConsensus,
          bookBreakdown,
          edge,
          edgePercent,
          signal,
          signalTeam,
          signalExplanation,
          edgeConfidence,
          numBooks,
        });
      } else {
        unmatchedBooks.push(`${oddsGame.away_team} vs ${oddsGame.home_team}`);
      }
    }

    // Sort by absolute edge
    games.sort((a: any, b: any) => Math.abs(b.edge || 0) - Math.abs(a.edge || 0));

    // ── Edge logging to DB ──
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const scanId = crypto.randomUUID();
      const rows = games.map((g: any) => {
        const hoursToTip = Math.max(
          (new Date(g.tipoff).getTime() - Date.now()) / 3600000,
          0
        );
        return {
          scan_id: scanId,
          game_date: todayStr,
          odds_api_game_id: g.id,
          poly_event_id: g.polyMarketSlug,
          poly_slug: g.polyMarketSlug,
          home_team: g.homeTeam,
          away_team: g.awayTeam,
          poly_price: g.polyPrice,
          book_consensus: g.bookConsensus,
          edge_pct: (g.edge || 0) * 100,
          poly_volume: g.polyVolume,
          num_books: g.numBooks,
          tip_off_time: g.tipoff,
          hours_to_tipoff: parseFloat(hoursToTip.toFixed(1)),
          edge_team: g.polyTeam || g.awayTeam,
          signal: g.signal,
          book_lines: g.bookBreakdown,
          sport,
        };
      });
      if (rows.length > 0) {
        await supabaseAdmin
          .from("edge_scans")
          .upsert(rows, { onConflict: "odds_api_game_id,game_date" });
      }
    } catch (logErr) {
      console.error("Edge logging failed:", logErr);
    }

    const polymarketOnly = polyEvents
      .filter((pe: any) => !matchedPolyIds.has(pe.id))
      .map((pe: any) => pe.title || "Unknown");

    const result = {
      games,
      unmatched: { polymarketOnly, booksOnly: unmatchedBooks },
      meta: {
        sport,
        scannedAt: new Date().toISOString(),
        oddsApiCreditsRemaining: oddsRes.creditsRemaining,
        gamesMatched: games.length,
        gamesUnmatched: unmatchedBooks.length,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
