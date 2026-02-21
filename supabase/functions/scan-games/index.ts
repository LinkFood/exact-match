import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    seriesId: "39",
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

// Team alias map for fuzzy matching
const TEAM_ALIASES: Record<string, string> = {
  // NCAAB
  "duke blue devils": "duke", duke: "duke",
  "north carolina tar heels": "unc", "north carolina": "unc", unc: "unc", "tar heels": "unc",
  "kentucky wildcats": "kentucky", kentucky: "kentucky",
  "kansas jayhawks": "kansas", kansas: "kansas",
  "gonzaga bulldogs": "gonzaga", gonzaga: "gonzaga",
  "villanova wildcats": "villanova", villanova: "villanova",
  "baylor bears": "baylor", baylor: "baylor",
  "michigan wolverines": "michigan", michigan: "michigan",
  "purdue boilermakers": "purdue", purdue: "purdue",
  "houston cougars": "houston", houston: "houston",
  "tennessee volunteers": "tennessee", tennessee: "tennessee",
  "uconn huskies": "uconn", connecticut: "uconn", "connecticut huskies": "uconn", uconn: "uconn",
  "auburn tigers": "auburn", auburn: "auburn",
  "iowa state cyclones": "iowa state", "iowa state": "iowa state",
  "alabama crimson tide": "alabama", alabama: "alabama",
  "arizona wildcats": "arizona", arizona: "arizona",
  "marquette golden eagles": "marquette", marquette: "marquette",
  "creighton bluejays": "creighton", creighton: "creighton",
  "texas longhorns": "texas", texas: "texas",
  "arkansas razorbacks": "arkansas", arkansas: "arkansas",
  "florida gators": "florida", florida: "florida",
  "wisconsin badgers": "wisconsin", wisconsin: "wisconsin",
  "michigan state spartans": "michigan state", "michigan state": "michigan state",
  "st. john's red storm": "st johns", "st johns": "st johns", "saint john's": "st johns",
  "ucla bruins": "ucla", ucla: "ucla",
  "oregon ducks": "oregon", oregon: "oregon",
  "clemson tigers": "clemson", clemson: "clemson",
  "louisville cardinals": "louisville", louisville: "louisville",
  "illinois fighting illini": "illinois", illinois: "illinois",
  "indiana hoosiers": "indiana", indiana: "indiana",
  "ohio state buckeyes": "ohio state", "ohio state": "ohio state",
  "memphis tigers": "memphis", memphis: "memphis",
  "san diego state aztecs": "san diego state", "san diego state": "san diego state", sdsu: "san diego state",
  // NBA
  "los angeles lakers": "lakers", "la lakers": "lakers", lakers: "lakers",
  "los angeles clippers": "clippers", "la clippers": "clippers", clippers: "clippers",
  "golden state warriors": "warriors", warriors: "warriors",
  "boston celtics": "celtics", celtics: "celtics",
  "milwaukee bucks": "bucks", bucks: "bucks",
  "philadelphia 76ers": "76ers", "76ers": "76ers", sixers: "76ers",
  "miami heat": "heat", heat: "heat",
  "denver nuggets": "nuggets", nuggets: "nuggets",
  "phoenix suns": "suns", suns: "suns",
  "dallas mavericks": "mavericks", mavericks: "mavericks", mavs: "mavericks",
  "new york knicks": "knicks", knicks: "knicks",
  "brooklyn nets": "nets", nets: "nets",
  "chicago bulls": "bulls", bulls: "bulls",
  "toronto raptors": "raptors", raptors: "raptors",
  "cleveland cavaliers": "cavaliers", cavaliers: "cavaliers", cavs: "cavaliers",
  "atlanta hawks": "hawks", hawks: "hawks",
  "sacramento kings": "kings", kings: "kings",
  "minnesota timberwolves": "timberwolves", timberwolves: "timberwolves", wolves: "timberwolves",
  "new orleans pelicans": "pelicans", pelicans: "pelicans",
  "oklahoma city thunder": "thunder", thunder: "thunder", okc: "thunder",
  "memphis grizzlies": "grizzlies", grizzlies: "grizzlies",
  "indiana pacers": "pacers", pacers: "pacers",
  "portland trail blazers": "blazers", blazers: "blazers", "trail blazers": "blazers",
  "utah jazz": "jazz", jazz: "jazz",
  "san antonio spurs": "spurs", spurs: "spurs",
  "detroit pistons": "pistons", pistons: "pistons",
  "charlotte hornets": "hornets", hornets: "hornets",
  "washington wizards": "wizards", wizards: "wizards",
  "orlando magic": "magic", magic: "magic",
  "houston rockets": "rockets", rockets: "rockets",
  // NFL
  "kansas city chiefs": "chiefs", chiefs: "chiefs",
  "buffalo bills": "bills", bills: "bills",
  "san francisco 49ers": "49ers", "49ers": "49ers", niners: "49ers",
  "philadelphia eagles": "eagles", eagles: "eagles",
  "dallas cowboys": "cowboys", cowboys: "cowboys",
  "baltimore ravens": "ravens", ravens: "ravens",
  "detroit lions": "lions", lions: "lions",
  "miami dolphins": "dolphins", dolphins: "dolphins",
  "cincinnati bengals": "bengals", bengals: "bengals",
  "jacksonville jaguars": "jaguars", jaguars: "jaguars",
  "pittsburgh steelers": "steelers", steelers: "steelers",
  "cleveland browns": "browns", browns: "browns",
  "green bay packers": "packers", packers: "packers",
  "seattle seahawks": "seahawks", seahawks: "seahawks",
  "new york giants": "giants", giants: "giants",
  "new york jets": "jets", jets: "jets",
  "los angeles rams": "rams", rams: "rams",
  "los angeles chargers": "chargers", chargers: "chargers",
  "minnesota vikings": "vikings", vikings: "vikings",
  "tampa bay buccaneers": "buccaneers", buccaneers: "buccaneers", bucs: "buccaneers",
  "new england patriots": "patriots", patriots: "patriots",
  "arizona cardinals": "cardinals", cardinals: "cardinals",
  "las vegas raiders": "raiders", raiders: "raiders",
  "denver broncos": "broncos", broncos: "broncos",
  "tennessee titans": "titans", titans: "titans",
  "indianapolis colts": "colts", colts: "colts",
  "carolina panthers": "panthers", panthers: "panthers",
  "atlanta falcons": "falcons", falcons: "falcons",
  "new orleans saints": "saints", saints: "saints",
  "chicago bears": "bears", bears: "bears",
  "washington commanders": "commanders", commanders: "commanders",
  "houston texans": "texans", texans: "texans",
};

function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (TEAM_ALIASES[lower]) return TEAM_ALIASES[lower];
  // Try progressively shorter matches
  const words = lower.split(" ");
  for (let i = words.length - 1; i >= 1; i--) {
    const partial = words.slice(0, i).join(" ");
    if (TEAM_ALIASES[partial]) return TEAM_ALIASES[partial];
  }
  // Last word as fallback
  const last = words[words.length - 1];
  if (TEAM_ALIASES[last]) return TEAM_ALIASES[last];
  return lower.replace(/\s+/g, " ");
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

    // Fetch all 3 APIs in parallel
    const [espnRes, polyRes, oddsRes] = await Promise.all([
      fetch(config.espn).then((r) => r.json()).catch(() => ({ events: [] })),
      fetch(
        `https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&tag_id=100639&active=true&closed=false&order=startTime&ascending=true&limit=100`
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
    const polyEvents = Array.isArray(polyRes) ? polyRes : [];
    const oddsGames = Array.isArray(oddsRes.data) ? oddsRes.data : [];

    console.log("ESPN events:", espnEvents.length, espnEvents.map((e: any) => e.shortName || e.name));
    console.log("Polymarket events:", polyEvents.length, polyEvents.map((e: any) => e.title));
    console.log("Odds API games:", oddsGames.length, oddsGames.map((g: any) => g.away_team + " vs " + g.home_team));

    const games = [];
    const matchedPolyIds = new Set<string>();
    const matchedOddsIds = new Set<string>();

    for (const oddsGame of oddsGames) {
      matchedOddsIds.add(oddsGame.id);
      const normHome = normalizeTeamName(oddsGame.home_team);
      const normAway = normalizeTeamName(oddsGame.away_team);

      // Find matching Polymarket event
      let polyMatch = null;
      for (const pe of polyEvents) {
        const title = pe.title?.toLowerCase() || "";
        const titleNorm = normalizeTeamName(title);
        if (
          (title.includes(normHome) || title.includes(normAway)) &&
          (title.includes(normHome) || title.includes(normAway))
        ) {
          // Check both teams are referenced
          const hasHome = title.includes(normHome) || titleNorm.includes(normHome);
          const hasAway = title.includes(normAway) || titleNorm.includes(normAway);
          if (hasHome && hasAway) {
            polyMatch = pe;
            matchedPolyIds.add(pe.id);
            break;
          }
        }
        // Try matching individual team names in title
        const titleWords = title.split(/\s+vs\.?\s+|\s+v\.?\s+/);
        if (titleWords.length === 2) {
          const t1 = normalizeTeamName(titleWords[0]);
          const t2 = normalizeTeamName(titleWords[1]);
          if (
            (t1 === normHome && t2 === normAway) ||
            (t1 === normAway && t2 === normHome)
          ) {
            polyMatch = pe;
            matchedPolyIds.add(pe.id);
            break;
          }
        }
      }

      // Find matching ESPN event
      let espnMatch = null;
      for (const ev of espnEvents) {
        const comps = ev.competitions?.[0]?.competitors || [];
        if (comps.length >= 2) {
          const names = comps.map((c: any) =>
            normalizeTeamName(c.team?.displayName || "")
          );
          if (names.includes(normHome) && names.includes(normAway)) {
            espnMatch = ev;
            break;
          }
        }
      }

      // Calculate book consensus
      const bookBreakdown: any[] = [];
      for (const bm of oddsGame.bookmakers || []) {
        const h2h = bm.markets?.find((m: any) => m.key === "h2h");
        if (!h2h) continue;
        // Find away team odds (the team Polymarket YES usually references)
        const awayOutcome = h2h.outcomes?.find(
          (o: any) => normalizeTeamName(o.name) === normAway
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

      // Parse Polymarket data
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
          polyPrice = parseFloat(prices[0]) || null;
          clobTokenId = tokens[0] || null;
          polyVolume = parseFloat(market.volume) || null;
          polyMarketSlug = polyMatch.slug || null;
          // Determine which team YES represents (first named in title)
          const titleParts = (polyMatch.title || "").split(/\s+vs\.?\s+|\s+v\.?\s+/);
          polyTeam = titleParts[0]?.trim() || oddsGame.away_team;
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
          const cn = normalizeTeamName(c.team?.displayName || "");
          const rank = c.curatedRank?.current;
          const abbr = c.team?.abbreviation || "";
          if (cn === normHome) {
            homeRank = rank && rank <= 25 ? rank : null;
            homeAbbr = abbr;
          } else if (cn === normAway) {
            awayRank = rank && rank <= 25 ? rank : null;
            awayAbbr = abbr;
          }
        }
      }

      games.push({
        id: oddsGame.id,
        matchConfidence: polyMatch ? "high" : "none",
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
      });
    }

    // Sort by absolute edge
    games.sort((a, b) => Math.abs(b.edge || 0) - Math.abs(a.edge || 0));

    const polymarketOnly = polyEvents
      .filter((pe: any) => !matchedPolyIds.has(pe.id))
      .map((pe: any) => pe.title || "Unknown");

    const booksOnly = oddsGames
      .filter((g: any) => {
        const normH = normalizeTeamName(g.home_team);
        const normA = normalizeTeamName(g.away_team);
        return !games.find(
          (mg) =>
            normalizeTeamName(mg.homeTeam) === normH &&
            normalizeTeamName(mg.awayTeam) === normA &&
            mg.polyPrice !== null
        );
      })
      .map((g: any) => `${g.away_team} vs ${g.home_team}`);

    const result = {
      games,
      unmatched: { polymarketOnly, booksOnly },
      meta: {
        sport,
        scannedAt: new Date().toISOString(),
        oddsApiCreditsRemaining: oddsRes.creditsRemaining,
        gamesMatched: games.filter((g) => g.matchConfidence !== "none").length,
        gamesUnmatched: games.filter((g) => g.matchConfidence === "none").length,
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
