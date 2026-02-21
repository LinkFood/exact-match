import { supabase } from "@/integrations/supabase/client";
import { ScanResult, PricePoint, Sport } from "@/types/polyedge";

export async function scanGames(sport: Sport, oddsApiKey: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke("scan-games", {
    body: { sport, oddsApiKey },
  });
  if (error) throw new Error(error.message || "Scan failed");
  return data as ScanResult;
}

export async function fetchPriceHistory(
  tokenId: string,
  interval = "1d",
  fidelity = 60
): Promise<PricePoint[]> {
  const { data, error } = await supabase.functions.invoke("price-history", {
    body: { tokenId, interval, fidelity },
  });
  if (error) throw new Error(error.message || "Price history failed");
  return data?.history || [];
}

export async function sendSlackAlert(
  webhookUrl: string,
  game: any
): Promise<void> {
  const { error } = await supabase.functions.invoke("send-slack-alert", {
    body: { webhookUrl, game },
  });
  if (error) throw new Error(error.message || "Slack alert failed");
}

export async function settleGames(oddsApiKey: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("settle-games", {
    body: { oddsApiKey },
  });
  if (error) throw new Error(error.message || "Settlement failed");
  return data;
}
