export type Sport = "ncaab" | "nba" | "nfl";

export interface BookBreakdown {
  book: string;
  odds: number;
  impliedProb: number;
}

export type Signal = "BUY_YES" | "BUY_NO" | "FAIR";

export interface GameData {
  id: string;
  matchConfidence: "high" | "medium" | "none";
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  homeRank: number | null;
  awayRank: number | null;
  tipoff: string;
  polyPrice: number | null;
  polyTeam: string | null;
  polyVolume: number | null;
  polyMarketSlug: string | null;
  polyMarketUrl: string | null;
  clobTokenId: string | null;
  bookConsensus: number;
  bookBreakdown: BookBreakdown[];
  edge: number | null;
  edgePercent: string | null;
  signal: Signal;
  signalTeam: string | null;
  signalExplanation: string | null;
  edgeConfidence: number | null;
  numBooks: number;
}

export interface ScanResult {
  games: GameData[];
  unmatched: {
    polymarketOnly: string[];
    booksOnly: string[];
  };
  meta: {
    sport: Sport;
    scannedAt: string;
    oddsApiCreditsRemaining: number | null;
    gamesMatched: number;
    gamesUnmatched: number;
  };
}

export interface PricePoint {
  t: number;
  p: number;
}

export interface Settings {
  slackWebhookUrl: string;
  edgeThreshold: number;
  autoScan: boolean;
  scanFrequency: number;
  sportsToMonitor: Sport[];
  minVolume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  slackWebhookUrl: "",
  edgeThreshold: 3,
  autoScan: true,
  scanFrequency: 15,
  sportsToMonitor: ["ncaab", "nba", "nfl"],
  minVolume: 0,
};
