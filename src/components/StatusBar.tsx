import { ScanResult } from "@/types/polyedge";

interface StatusBarProps {
  scanResult: ScanResult | null;
  isScanning: boolean;
  edgeThreshold: number;
  autoScan: boolean;
  scanFrequency: number;
  nextScanIn: number | null;
  onRefresh: () => void;
}

export function StatusBar({
  scanResult,
  isScanning,
  edgeThreshold,
  autoScan,
  scanFrequency,
  nextScanIn,
  onRefresh,
}: StatusBarProps) {
  const meta = scanResult?.meta;
  const edgesFound = scanResult?.games.filter(
    (g) => Math.abs(g.edge || 0) * 100 >= edgeThreshold
  ).length || 0;

  const lastScan = meta?.scannedAt
    ? new Date(meta.scannedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border text-xs">
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground">
          {meta ? `${meta.gamesMatched + meta.gamesUnmatched} games scanned` : "No scan yet"}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className={edgesFound > 0 ? "text-edge-green font-semibold" : "text-muted-foreground"}>
          {edgesFound} edge{edgesFound !== 1 ? "s" : ""} found
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">Last scan: {lastScan}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Server cron configured
        </span>
        {meta?.oddsApiCreditsRemaining !== null && meta?.oddsApiCreditsRemaining !== undefined && (
          <span className="text-muted-foreground">
            Odds API: {meta.oddsApiCreditsRemaining}/500 credits
          </span>
        )}
        <span className="text-muted-foreground">
          {autoScan
            ? `Auto-scan: ON (${scanFrequency}min)${
                nextScanIn !== null ? ` — next in ${formatCountdown(nextScanIn)}` : ""
              }`
            : "Auto-scan: OFF"}
        </span>
        <button
          onClick={onRefresh}
          disabled={isScanning}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Manual refresh"
        >
          <svg
            className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
