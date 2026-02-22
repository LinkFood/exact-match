import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SPORT_CONFIG: Record<string, { oddsKey: string; seriesId: string }> = {
  ncaab: { oddsKey: "basketball_ncaab", seriesId: "10470" },
  nba: { oddsKey: "basketball_nba", seriesId: "10345" },
  nfl: { oddsKey: "americanfootball_nfl", seriesId: "10187" },
};

// ── Mascot suffixes (multi-word first) ──
const MASCOT_SUFFIXES = [
  "Demon Deacons","Blue Devils","Tar Heels","Red Storm","Red Raiders",
  "Golden Eagles","Runnin' Rebels","Running Rebels","Screaming Eagles",
  "Yellow Jackets","Nittany Lions","Crimson Tide","Fighting Irish",
  "Golden Gophers","Horned Frogs","Scarlet Knights","Mean Green",
  "Red Foxes","Blue Hens","Fightin' Blue Hens","Golden Grizzlies","River Hawks",
  "Great Danes","Black Bears","Purple Aces","Ragin' Cajuns",
  "Fighting Illini","Fighting Hawks","Golden Flashes","Blue Hose",
  "Runnin' Bulldogs","Red Flash","Golden Panthers","Blue Raiders",
  "Trail Blazers","Black Knights",
  "Aggies","Anteaters","Aztecs","Badgers","Bears","Bearcats","Beavers",
  "Bengals","Billikens","Bison","Blazers","Boilermakers","Bonnies",
  "Braves","Bruins","Buckeyes","Buccaneers","Bulldogs","Bulls",
  "Cardinals","Catamounts","Cavaliers","Celtics","Chanticleers",
  "Chargers","Chiefs","Clippers","Colonials","Colonels","Colts","Commanders",
  "Commodores","Cougars","Cowboys","Crimson","Crusaders","Cyclones",
  "Dolphins","Dons","Dragons","Ducks","Dukes",
  "Eagles","Engineers","Explorers",
  "Falcons","Flames","Flyers","Friars",
  "Gaels","Gators","Giants","Governors","Grizzlies",
  "Hatters","Hawks","Highlanders","Hilltoppers","Hokies","Hoosiers",
  "Hornets","Huskies","Islanders",
  "Jaguars","Jayhawks","Jays","Jets",
  "Kangaroos","Kings","Knicks","Knights",
  "Lakers","Lancers","Leathernecks","Leopards","Lions","Lobos","Longhorns","Lumberjacks",
  "Magic","Mastodons","Mavericks","Miners","Mocs","Monarchs",
  "Mountaineers","Musketeers","Mustangs",
  "Nets","Norse","Nuggets","Ospreys","Owls",
  "Pacers","Packers","Paladins","Panthers","Patriots","Peacocks",
  "Pelicans","Penguins","Phoenix","Pilots","Pioneers","Pirates",
  "Pistons","Pride","Privateers",
  "Racers","Raiders","Rams","Raptors","Rattlers","Ravens",
  "Razorbacks","Rebels","Retrievers","Roadrunners","Rockets","Royals",
  "Salukis","Saints","Seahawks","Seawolves","Seminoles","Shockers",
  "Skyhawks","Sooners","Spartans","Spiders","Spurs","Stags",
  "Steelers","Suns","Sycamores",
  "Terps","Terrapins","Terriers","Texans","Thunder","Thunderbirds",
  "Tigers","Timberwolves","Titans","Tommies","Toreros","Trojans",
  "Utes","Vandals","Vikings","Volunteers","Vulcans",
  "Warhawks","Warriors","Waves","Wildcats","Wizards","Wolfpack",
  "Wolverines","Wolves","Zags","Zips",
  "Heat","Jazz","76ers","Roos",
];

const SCHOOL_ALIASES: Record<string, string> = {
  "uconn":"connecticut","ole miss":"mississippi","lsu":"louisiana state",
  "smu":"southern methodist","tcu":"texas christian","ucf":"central florida",
  "unlv":"nevada las vegas","utep":"texas el paso","vcu":"virginia commonwealth",
  "fiu":"florida international","florida int'l":"florida international",
  "fau":"florida atlantic","unc":"north carolina","pitt":"pittsburgh",
  "cal":"california","usc":"southern california","umass":"massachusetts",
  "uab":"alabama birmingham","utsa":"texas san antonio","siu":"southern illinois",
  "niu":"northern illinois","wku":"western kentucky","ecu":"east carolina",
  "jmu":"james madison","odu":"old dominion","byu":"brigham young",
  "st. john's":"saint johns","saint john's":"saint johns","st johns":"saint johns",
  "st john's":"saint johns",
  "saint mary's":"saint marys","st. mary's":"saint marys","st mary's":"saint marys",
  "st. bonaventure":"saint bonaventure","saint bonaventure":"saint bonaventure",
  "st. peter's":"saint peters","saint peter's":"saint peters",
  "st. joseph's":"saint josephs","saint joseph's":"saint josephs",
  "st. thomas":"saint thomas","saint thomas":"saint thomas",
  "st. francis":"saint francis","saint francis":"saint francis",
  "uncw":"unc wilmington","uncg":"unc greensboro","unca":"unc asheville",
  "siue":"siu edwardsville","umkc":"missouri kansas city",
  "kansas city":"missouri kansas city","penn":"pennsylvania",
  "ul monroe":"louisiana monroe","se missouri":"southeast missouri",
  "southeastern missouri state":"southeast missouri state",
  "app state":"appalachian state","loyola maryland":"loyola md",
  "loyola (md)":"loyola md","queens (nc)":"queens","queens university":"queens",
  "miami (fl)":"miami","miami (oh)":"miami ohio",
  "sam houston state":"sam houston","massachusetts lowell":"umass lowell",
  "ut arlington":"texas arlington",
  "la lakers":"los angeles lakers","la clippers":"los angeles clippers",
  "okc":"oklahoma city","niners":"san francisco",
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
  n = n.replace(/\bfightin'?\s*/g, "");
  n = n.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  n = n.replace(/\([^)]*\)/g, "").trim();
  n = n.replace(/\buniversity\b/g, "").replace(/\bcollege\b/g, "").trim();
  n = n.replace(/\s+/g, " ").trim();
  // Alias lookup FIRST — so "st. john's" matches before "st" → "state" regex
  if (SCHOOL_ALIASES[n]) return SCHOOL_ALIASES[n];
  for (const [key, val] of Object.entries(SCHOOL_ALIASES)) {
    if (n.startsWith(key + " ")) {
      n = val + n.substring(key.length);
      return n;
    }
  }
  // "st" / "st." → "state" — only runs if no alias matched
  n = n.replace(/\bst\.?\b/g, "state");
  return n;
}

function getSchoolKey(fullTeamName: string): string {
  return normalizeSchoolName(extractSchoolName(fullTeamName));
}

function americanToImpliedProbability(odds: number): number {
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ODDS_API_KEY = Deno.env.get("ODDS_API_KEY");
    const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
    const ALERT_MIN_EDGE = 3.0;
    const ALERT_MIN_VOLUME = 1000;
    const ODDS_CACHE_MINUTES = 30;

    if (!ODDS_API_KEY) {
      return new Response(JSON.stringify({ error: "ODDS_API_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endDateMin = today.toISOString();
    const twoDaysOut = new Date(today);
    twoDaysOut.setUTCDate(twoDaysOut.getUTCDate() + 2);
    const endDateMax = twoDaysOut.toISOString();

    const results: Record<string, any> = {};

    for (const [sport, config] of Object.entries(SPORT_CONFIG)) {
      // 1. Always fetch fresh Polymarket data (free)
      let polyEvents: any[] = [];
      try {
        const polyRes = await fetch(
          `https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&active=true&closed=false&limit=200&end_date_min=${endDateMin}&end_date_max=${endDateMax}`
        );
        const allPoly = await polyRes.json();
        polyEvents = Array.isArray(allPoly)
          ? allPoly.filter((e: any) => e.eventDate === todayStr)
          : [];
      } catch (e) {
        console.error(`Poly fetch failed for ${sport}:`, e);
        continue;
      }

      if (polyEvents.length === 0) {
        results[sport] = { scanned: 0, edges: 0, freshOdds: false };
        continue;
      }

      // 2. Check if odds data is stale
      const { data: meta } = await supabase
        .from("scan_meta")
        .select("last_odds_fetch")
        .eq("id", sport)
        .single();

      const lastFetch = meta?.last_odds_fetch
        ? new Date(meta.last_odds_fetch).getTime()
        : 0;
      const needFreshOdds =
        Date.now() - lastFetch > ODDS_CACHE_MINUTES * 60 * 1000;

      let oddsGames: any[] = [];

      if (needFreshOdds) {
        try {
          const oddsRes = await fetch(
            `https://api.the-odds-api.com/v4/sports/${config.oddsKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,espnbet`
          );
          const oddsData = await oddsRes.json();
          if (!oddsRes.ok) {
            console.error(`Odds API error for ${sport}: status=${oddsRes.status}, body=${JSON.stringify(oddsData)}`);
          }
          console.log(`Odds API ${sport}: status=${oddsRes.status}, games=${Array.isArray(oddsData) ? oddsData.length : 'not-array'}`);
          oddsGames = oddsRes.ok && Array.isArray(oddsData) ? oddsData : [];

          // Cache odds
          await supabase.from("cached_odds").upsert({
            id: sport,
            data: oddsGames,
            fetched_at: new Date().toISOString(),
          });
          await supabase.from("scan_meta").upsert({
            id: sport,
            last_odds_fetch: new Date().toISOString(),
          });

          console.log(`Fresh odds fetched for ${sport}: ${oddsGames.length} games`);
        } catch (e) {
          console.error(`Odds fetch failed for ${sport}:`, e);
          // Fall back to cache
          const { data: cached } = await supabase
            .from("cached_odds")
            .select("data")
            .eq("id", sport)
            .single();
          oddsGames = (cached?.data as any[]) || [];
        }
      } else {
        const { data: cached } = await supabase
          .from("cached_odds")
          .select("data")
          .eq("id", sport)
          .single();
        oddsGames = (cached?.data as any[]) || [];
        console.log(`Using cached odds for ${sport}: ${oddsGames.length} games`);
      }

      // 3. Match + calculate edges (same logic as scan-games)
      const games: any[] = [];
      const scanId = crypto.randomUUID();

      for (const oddsGame of oddsGames) {
        const oddsHomeKey = getSchoolKey(oddsGame.home_team);
        const oddsAwayKey = getSchoolKey(oddsGame.away_team);

        // Match to Polymarket
        let polyMatch: any = null;
        for (const pe of polyEvents) {
          const title = pe.title || "";
          const vsSplit = title.split(/\s+vs\.?\s+/i);
          if (vsSplit.length !== 2) continue;
          const ps1 = getSchoolKey(vsSplit[0]);
          const ps2 = getSchoolKey(vsSplit[1]);
          if (
            (ps1 === oddsHomeKey && ps2 === oddsAwayKey) ||
            (ps1 === oddsAwayKey && ps2 === oddsHomeKey)
          ) {
            polyMatch = pe;
            break;
          }
        }

        if (!polyMatch) continue;

        // Book consensus (away team) — de-vigged
        const bookBreakdown: any[] = [];
        for (const bm of oddsGame.bookmakers || []) {
          const h2h = bm.markets?.find((m: any) => m.key === "h2h");
          if (!h2h || !h2h.outcomes || h2h.outcomes.length < 2) continue;
          const awayOutcome = h2h.outcomes.find(
            (o: any) => getSchoolKey(o.name) === oddsAwayKey
          );
          const homeOutcome = h2h.outcomes.find(
            (o: any) => getSchoolKey(o.name) === oddsHomeKey
          );
          if (awayOutcome && homeOutcome) {
            const rawAway = americanToImpliedProbability(awayOutcome.price);
            const rawHome = americanToImpliedProbability(homeOutcome.price);
            const overround = rawAway + rawHome;
            const deviggedAway = overround > 0 ? rawAway / overround : rawAway;
            bookBreakdown.push({
              book: bm.title,
              odds: awayOutcome.price,
              impliedProb: deviggedAway,
            });
          }
        }

        const bookConsensus =
          bookBreakdown.length > 0
            ? bookBreakdown.reduce((s: number, b: any) => s + b.impliedProb, 0) /
              bookBreakdown.length
            : 0;

        // Side alignment
        let polyPrice: number | null = null;
        let polyTeam: string | null = null;
        let polyVolume: number | null = null;
        let polySlug: string | null = null;

        if (polyMatch.markets?.length > 0) {
          const market = polyMatch.markets[0];
          try {
            const prices = JSON.parse(market.outcomePrices || "[]");
            const volParsed = parseFloat(market.volume);
            polyVolume = isNaN(volParsed) ? null : volParsed;
            polySlug = polyMatch.slug || null;

            const titleParts = (polyMatch.title || "").split(/\s+vs\.?\s+/i);
            if (titleParts.length === 2) {
              const ps1 = getSchoolKey(titleParts[0]);
              const awayIdx = ps1 === oddsAwayKey ? 0 : 1;
              const priceParsed = parseFloat(prices[awayIdx]);
              polyPrice = isNaN(priceParsed) ? null : priceParsed;
              polyTeam = titleParts[awayIdx]?.trim() || oddsGame.away_team;
            } else {
              const priceParsed = parseFloat(prices[0]);
              polyPrice = isNaN(priceParsed) ? null : priceParsed;
              polyTeam = oddsGame.away_team;
            }
          } catch {}
        }

        // Edge calculation
        if (polyPrice === null || bookConsensus <= 0) continue;

        const edge = bookConsensus - polyPrice;
        const edgePct = edge * 100;
        const tipoff = oddsGame.commence_time;

        // Skip live games
        if (new Date(tipoff) < new Date()) continue;

        const hoursToTip = Math.max(
          (new Date(tipoff).getTime() - Date.now()) / 3600000, 0
        );

        // Upsert to edge_scans
        const row = {
          scan_id: scanId,
          game_date: todayStr,
          odds_api_game_id: oddsGame.id,
          poly_event_id: polySlug,
          poly_slug: polySlug,
          home_team: oddsGame.home_team,
          away_team: oddsGame.away_team,
          poly_price: polyPrice,
          book_consensus: bookConsensus,
          edge_pct: edgePct,
          poly_volume: polyVolume,
          num_books: bookBreakdown.length,
          tip_off_time: tipoff,
          hours_to_tipoff: parseFloat(hoursToTip.toFixed(1)),
          edge_team: polyTeam || oddsGame.away_team,
          signal: edge > 0.02 ? "BUY_YES" : edge < -0.02 ? "BUY_NO" : "FAIR",
          book_lines: bookBreakdown,
          sport,
        };

        games.push({ ...row, edge, polyMarketUrl: polySlug ? `https://polymarket.com/event/${polySlug}` : null });

        try {
          await supabase
            .from("edge_scans")
            .upsert(row, { onConflict: "odds_api_game_id,game_date" });
        } catch (e) {
          console.error("Upsert failed:", e);
        }
      }

      // 4. Alert on edges meeting threshold
      let alertsSent = 0;
      if (SLACK_WEBHOOK_URL) {
        for (const g of games) {
          const absEdge = Math.abs(g.edge_pct);
          if (absEdge < ALERT_MIN_EDGE || (g.poly_volume || 0) < ALERT_MIN_VOLUME) continue;

          // Check dedup
          const { data: existing } = await supabase
            .from("alert_log")
            .select("id, last_edge")
            .eq("poly_event_id", g.poly_event_id || g.odds_api_game_id)
            .eq("alert_date", todayStr)
            .maybeSingle();

          const shouldAlert =
            !existing || Math.abs(absEdge - Math.abs(existing.last_edge || 0)) >= 1.0;

          if (shouldAlert) {
            const tipoffStr = new Date(g.tip_off_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/New_York",
            });

            try {
              await fetch(SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text:
                    `🚨 *PolyEdge Alert* — ${g.edge_pct > 0 ? "+" : ""}${absEdge.toFixed(1)}% Edge\n\n` +
                    `*${g.away_team} vs ${g.home_team}*\n` +
                    `📊 Poly: ${Math.round((g.poly_price || 0) * 100)}¢ | Books: ${((g.book_consensus || 0) * 100).toFixed(1)}% (${g.num_books} books)\n` +
                    `🎯 Edge: ${g.edge_pct > 0 ? "+" : ""}${absEdge.toFixed(1)}% → BUY ${g.edge_team}\n` +
                    `💰 Volume: $${(g.poly_volume || 0).toLocaleString()} | ⏰ Tip-off: ${tipoffStr} ET\n\n` +
                    (g.polyMarketUrl ? `<${g.polyMarketUrl}|Open on Polymarket>` : ""),
                }),
              });

              await supabase.from("alert_log").upsert(
                {
                  poly_event_id: g.poly_event_id || g.odds_api_game_id,
                  alert_date: todayStr,
                  last_edge: absEdge,
                  alerted_at: new Date().toISOString(),
                },
                { onConflict: "poly_event_id,alert_date" }
              );
              alertsSent++;
            } catch (e) {
              console.error("Slack alert failed:", e);
            }
          }
        }
      }

      results[sport] = {
        scanned: games.length,
        edges: games.filter((g) => Math.abs(g.edge_pct) >= ALERT_MIN_EDGE).length,
        freshOdds: needFreshOdds,
        alertsSent,
      };
    }

    console.log("Scan complete:", JSON.stringify(results));

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("scan-edges error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
