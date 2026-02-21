import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { oddsApiKey } = await req.json();
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

      const winner = homePoints > awayPoints ? scoreMatch.home_team : scoreMatch.away_team;

      // Check if edge_team won
      // edge_team is the Poly team name - need to check if it matches the winner
      const edgeTeamLower = (game.edge_team || "").toLowerCase();
      const winnerLower = winner.toLowerCase();
      const edgeTeamWon =
        winnerLower.includes(edgeTeamLower) ||
        edgeTeamLower.includes(winnerLower) ||
        edgeTeamLower === winnerLower;

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
