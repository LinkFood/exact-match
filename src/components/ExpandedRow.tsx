import { PricePoint, GameData } from "@/types/polyedge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatVolume } from "@/lib/polyedge";
import { useState } from "react";

interface ExpandedRowProps {
  game: GameData;
  priceHistory: PricePoint[];
  onIntervalChange?: (interval: "1d" | "1w") => void;
}

export function ExpandedRow({ game, priceHistory, onIntervalChange }: ExpandedRowProps) {
  const [chartInterval, setChartInterval] = useState<"1d" | "1w">("1d");

  const chartData = priceHistory.map((p) => ({
    time: new Date(p.t * 1000).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    price: p.p * 100,
  }));

  return (
    <div className="px-6 py-4 bg-secondary/30 border-t border-border space-y-4">
      {/* Price Chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Polymarket Price History — {game.polyTeam} YES
          </span>
          <div className="flex gap-1">
            {(["1d", "1w"] as const).map((interval) => (
              <button
                key={interval}
                onClick={() => {
                  setChartInterval(interval);
                  onIntervalChange?.(interval);
                }}
                className={`px-2 py-0.5 text-xs rounded ${
                  chartInterval === interval
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {interval === "1d" ? "24H" : "7D"}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  tick={{ fill: "hsl(245, 12%, 52%)", fontSize: 10 }}
                  axisLine={{ stroke: "hsl(248, 16%, 15%)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(245, 12%, 52%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => `${v.toFixed(0)}¢`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(240, 14%, 8%)",
                    border: "1px solid hsl(248, 16%, 15%)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "hsl(240, 10%, 91%)",
                  }}
                  formatter={(v: number) => [`${v.toFixed(1)}¢`, "Price"]}
                />
                {game.bookConsensus > 0 && (
                  <ReferenceLine
                    y={game.bookConsensus * 100}
                    stroke="hsl(30, 100%, 63%)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `Books ${(game.bookConsensus * 100).toFixed(1)}%`,
                      fill: "hsl(30, 100%, 63%)",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(224, 100%, 64%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No price history available
          </div>
        )}
      </div>

      {/* Book Breakdown */}
      {game.bookBreakdown.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sportsbook Breakdown
          </span>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            {game.bookBreakdown.map((b) => (
              <div
                key={b.book}
                className="flex items-center justify-between text-xs py-1 border-b border-border/50"
              >
                <span className="text-muted-foreground">{b.book}</span>
                <span className="font-mono">
                  {b.odds > 0 ? "+" : ""}
                  {b.odds} ({(b.impliedProb * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
            <div className="col-span-2 flex items-center justify-between text-xs py-1 border-t border-border font-semibold">
              <span className="text-muted-foreground">Consensus</span>
              <span className="font-mono text-chart-consensus">
                {(game.bookConsensus * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Meta + Action */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Volume: {formatVolume(game.polyVolume)}
        </span>
        {game.polyMarketUrl && (
          <a
            href={game.polyMarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Open on Polymarket
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
