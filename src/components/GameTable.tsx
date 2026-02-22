import { useState } from "react";
import { GameData, PricePoint } from "@/types/polyedge";
import { Sparkline } from "./Sparkline";
import { ExpandedRow } from "./ExpandedRow";
import { formatVolume, formatTipoff, formatTeamWithRank } from "@/lib/polyedge";

interface GameTableProps {
  games: GameData[];
  priceHistories: Record<string, PricePoint[]>;
  edgeThreshold: number;
  minVolume: number;
  isLoading: boolean;
  onExpandGame: (game: GameData) => void;
  onChartIntervalChange?: (tokenId: string, interval: "1d" | "1w") => void;
}

type SortKey = "edge" | "tipoff" | "volume" | "polyPrice";

export function GameTable({
  games,
  priceHistories,
  edgeThreshold,
  minVolume,
  isLoading,
  onExpandGame,
  onChartIntervalChange,
}: GameTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("edge");
  const [hideFair, setHideFair] = useState(false);

  const filtered = games.filter((g) => {
    if (hideFair && (Math.abs(g.edge || 0) * 100) < edgeThreshold) return false;
    if (minVolume > 0 && (g.polyVolume || 0) < minVolume) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "edge":
        return Math.abs(b.edge || 0) - Math.abs(a.edge || 0);
      case "tipoff":
        return new Date(a.tipoff).getTime() - new Date(b.tipoff).getTime();
      case "volume":
        return (b.polyVolume || 0) - (a.polyVolume || 0);
      case "polyPrice":
        return (b.polyPrice || 0) - (a.polyPrice || 0);
      default:
        return 0;
    }
  });

  const handleRowClick = (game: GameData) => {
    const newId = expandedId === game.id ? null : game.id;
    setExpandedId(newId);
    if (newId) onExpandGame(game);
  };

  const SortHeader = ({
    label,
    sortKeyVal,
    className = "",
  }: {
    label: string;
    sortKeyVal: SortKey;
    className?: string;
  }) => (
    <button
      onClick={() => setSortKey(sortKeyVal)}
      className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${
        sortKey === sortKeyVal ? "text-primary" : ""
      } ${className}`}
    >
      {label}
      {sortKey === sortKeyVal && " ↓"}
    </button>
  );

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No games found. Try scanning or switching sports.</p>
      </div>
    );
  }

  if (games.length > 0 && sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        All games hidden by current filters
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Filter controls */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={hideFair}
            onChange={(e) => setHideFair(e.target.checked)}
            className="rounded border-border bg-secondary"
          />
          Hide fair-priced
        </label>
        <span className="text-xs text-muted-foreground">
          {sorted.length} game{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[2fr_80px_80px_80px_80px_140px_80px_40px] gap-2 px-4 py-2 border-b border-border items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Teams
        </span>
        <SortHeader label="Tip-off" sortKeyVal="tipoff" />
        <SortHeader label="Poly ¢" sortKeyVal="polyPrice" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          24hr
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Books %
        </span>
        <SortHeader label="Edge" sortKeyVal="edge" />
        <SortHeader label="Volume" sortKeyVal="volume" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          ●
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {sorted.map((game) => {
          const isExpanded = expandedId === game.id;
          const edgeAbs = Math.abs(game.edge || 0) * 100;
          const isEdge = edgeAbs >= edgeThreshold;
          const isBuy = game.signal === "BUY_YES";
          const isSell = game.signal === "BUY_NO";
          let rowBg = "";
          if (isEdge && isBuy) rowBg = "bg-edge-green-bg";
          else if (isEdge && isSell) rowBg = "bg-edge-red-bg";

          return (
            <div key={game.id}>
              <div
                onClick={() => handleRowClick(game)}
                className={`grid grid-cols-[2fr_80px_80px_80px_80px_140px_80px_40px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-[hsl(var(--card-hover))] transition-colors ${rowBg}`}
              >
                {/* Teams */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate">
                    {formatTeamWithRank(game.awayTeam, game.awayRank, game.awayAbbr)}
                  </span>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <span className="text-sm truncate">
                    {formatTeamWithRank(game.homeTeam, game.homeRank, game.homeAbbr)}
                  </span>
                </div>

                {/* Tipoff */}
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTipoff(game.tipoff)}
                </span>

                {/* Poly Price */}
                <span className="text-sm font-mono font-semibold">
                  {game.polyPrice !== null ? `${(game.polyPrice * 100).toFixed(0)}¢` : "—"}
                </span>

                {/* Sparkline */}
                <Sparkline
                  data={priceHistories[game.clobTokenId || ""] || []}
                  bookConsensus={game.bookConsensus}
                />

                {/* Book Consensus */}
                <span className="text-sm font-mono">
                  {game.bookConsensus > 0
                    ? `${(game.bookConsensus * 100).toFixed(1)}% (${game.bookBreakdown.length})`
                    : "—"}
                </span>

                {/* Edge + Signal */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-mono font-bold ${
                      isEdge && isBuy
                        ? "text-edge-green"
                        : isEdge && isSell
                        ? "text-edge-red"
                        : "text-muted-foreground"
                    }`}
                  >
                    {game.edgePercent || "—"}
                  </span>
                  {isEdge && (
                    <a
                      href={game.polyMarketUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs px-1.5 py-0.5 rounded font-semibold hover:opacity-80 transition-opacity ${
                        isBuy
                          ? "bg-edge-green-bg text-edge-green"
                          : "bg-edge-red-bg text-edge-red"
                      }`}
                    >
                      {isBuy ? "BUY" : "SELL"} {game.polyTeam?.split(" ").pop()}
                    </a>
                  )}
                  {game.edgeConfidence !== null && game.edgeConfidence > 0 && (
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                        game.edgeConfidence > 0.5
                          ? "bg-edge-green-bg text-edge-green"
                          : game.edgeConfidence > 0.1
                          ? "bg-chart-consensus/20 text-chart-consensus"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={`Confidence: ${game.edgeConfidence.toFixed(3)}`}
                    >
                      {game.edgeConfidence > 0.5 ? "HIGH" : game.edgeConfidence > 0.1 ? "MED" : "LOW"}
                    </span>
                  )}
                </div>

                {/* Volume */}
                <span className="text-xs text-muted-foreground font-mono">
                  {formatVolume(game.polyVolume)}
                </span>

                {/* Match confidence */}
                <div className="flex justify-center">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      game.matchConfidence === "high"
                        ? "bg-edge-green"
                        : game.matchConfidence === "medium"
                        ? "bg-chart-consensus"
                        : "bg-muted-foreground"
                    }`}
                  />
                </div>
              </div>

              {isExpanded && (
                <ExpandedRow
                  game={game}
                  priceHistory={priceHistories[game.clobTokenId || ""] || []}
                  onIntervalChange={(interval) => onChartIntervalChange?.(game.clobTokenId || "", interval)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
