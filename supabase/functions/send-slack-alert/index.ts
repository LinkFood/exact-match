import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { webhookUrl, game } = await req.json();

    if (!webhookUrl || !game) {
      return new Response(
        JSON.stringify({ error: "webhookUrl and game are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const tipoff = new Date(game.tipoff).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });

    const message = {
      text:
        `🚨 *EDGE DETECTED*\n\n` +
        `*${game.awayTeam} vs ${game.homeTeam}*\n` +
        `⏰ Tip-off: ${tipoff} ET\n\n` +
        `📊 Polymarket: ${game.polyTeam} YES at ${((game.polyPrice || 0) * 100).toFixed(0)}¢\n` +
        `📚 Books consensus: ${((game.bookConsensus || 0) * 100).toFixed(1)}%\n` +
        `🎯 Edge: ${game.edgePercent}\n\n` +
        `💡 ${game.signalExplanation}\n\n` +
        `🔗 <${game.polyMarketUrl}|Trade on Polymarket>`,
    };

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!slackRes.ok) {
      const text = await slackRes.text();
      throw new Error(`Slack API error: ${text}`);
    }

    return new Response(JSON.stringify({ success: true }), {
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
