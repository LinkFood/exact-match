import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── School-name normalization (ported from scan-games) ──
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
  if (SCHOOL_ALIASES[n]) return SCHOOL_ALIASES[n];
  for (const [key, val] of Object.entries(SCHOOL_ALIASES)) {
    if (n.startsWith(key + " ")) {
      n = val + n.substring(key.length);
      return n;
    }
  }
  n = n.replace(/\bst\.?\b/g, "state");
  return n;
}

function getSchoolKey(fullTeamName: string): string {
  return normalizeSchoolName(extractSchoolName(fullTeamName));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const oddsApiKey = body.oddsApiKey || Deno.env.get("ODDS_API_KEY");
    if (!oddsApiKey) {
      return new Response(
        JSON.stringify({ error: "oddsApiKey required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get unsettled games
    const { data: unsettled, error: fetchErr } = await supabaseAdmin
      .from("edge_scans")
      .select("*")
      .is("result", null)
      .lt("game_date", new Date().toISOString().split("T")[0]);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!unsettled || unsettled.length === 0) {
      return new Response(
        JSON.stringify({ settled: 0, message: "No games to settle" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique sports from unsettled games
    const sports = [...new Set(unsettled.map((g: any) => g.sport || "ncaab"))];

    const sportToOddsKey: Record<string, string> = {
      ncaab: "basketball_ncaab",
      nba: "basketball_nba",
      nfl: "americanfootball_nfl",
    };

    // Fetch scores for each sport
    const allScores: any[] = [];
    for (const sport of sports) {
      const oddsKey = sportToOddsKey[sport] || "basketball_ncaab";
      try {
        const res = await fetch(
          `https://api.the-odds-api.com/v4/sports/${oddsKey}/scores/?apiKey=${oddsApiKey}&daysFrom=3&dateFormat=iso`
        );
        const scores = await res.json();
        if (Array.isArray(scores)) {
          allScores.push(...scores);
        }
      } catch (e) {
        console.error(`Failed to fetch scores for ${sport}:`, e);
      }
    }

    let settledCount = 0;
    for (const game of unsettled) {
      const scoreMatch = allScores.find(
        (s: any) => s.id === game.odds_api_game_id && s.completed
      );
      if (!scoreMatch || !scoreMatch.scores) continue;

      // Determine winner
      const scores = scoreMatch.scores;
      if (scores.length < 2) continue;

      const homeScore = scores.find((s: any) => s.name === scoreMatch.home_team);
      const awayScore = scores.find((s: any) => s.name === scoreMatch.away_team);
      if (!homeScore || !awayScore) continue;

      const homePoints = parseInt(homeScore.score);
      const awayPoints = parseInt(awayScore.score);
      if (isNaN(homePoints) || isNaN(awayPoints)) continue;

      // Handle ties — skip settlement (push)
      if (homePoints === awayPoints) {
        await supabaseAdmin
          .from("edge_scans")
          .update({
            result: "push",
            edge_team_won: false,
            settled_at: new Date().toISOString(),
          })
          .eq("id", game.id);
        settledCount++;
        continue;
      }

      const winner = homePoints > awayPoints ? scoreMatch.home_team : scoreMatch.away_team;

      // Use normalized school keys for reliable matching
      const edgeTeamKey = getSchoolKey(game.edge_team || "");
      const winnerKey = getSchoolKey(winner);
      const edgeTeamWon = edgeTeamKey === winnerKey;

      const result = edgeTeamWon ? "win" : "loss";

      const { error: updateErr } = await supabaseAdmin
        .from("edge_scans")
        .update({
          result,
          edge_team_won: edgeTeamWon,
          settled_at: new Date().toISOString(),
        })
        .eq("id", game.id);

      if (!updateErr) settledCount++;
    }

    return new Response(
      JSON.stringify({
        settled: settledCount,
        total_unsettled: unsettled.length,
        scores_found: allScores.filter((s: any) => s.completed).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
