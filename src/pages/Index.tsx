import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Sport, ScanResult, PricePoint, Settings } from "@/types/polyedge";
import { loadSettings, saveSettings } from "@/lib/polyedge";
import { scanGames, fetchPriceHistory } from "@/lib/api";
import { SportTabs } from "@/components/SportTabs";
import { StatusBar } from "@/components/StatusBar";
import { GameTable } from "@/components/GameTable";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UnmatchedSection } from "@/components/UnmatchedSection";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [activeSport, setActiveSport] = useState<Sport>("ncaab");
  const [scanResults, setScanResults] = useState<Record<string, ScanResult | null>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [priceHistories, setPriceHistories] = useState<Record<string, PricePoint[]>>({});
  const priceHistoriesRef = useRef<Record<string, PricePoint[]>>({});
  const [nextScanIn, setNextScanIn] = useState<number | null>(null);
  const scanCacheRef = useRef<Record<string, { data: ScanResult; timestamp: number }>>({});
  const isScanningRef = useRef(false);
  const { toast } = useToast();

  // Sync priceHistories state to ref so doScan avoids stale closure
  useEffect(() => {
    priceHistoriesRef.current = priceHistories;
  }, [priceHistories]);

  // Derive active tab's scan result
  const scanResult = scanResults[activeSport] || null;

  const doScan = useCallback(
    async (sport: Sport, showToast = true) => {
      // Concurrent scan guard
      if (isScanningRef.current) return null;
      isScanningRef.current = true;

      // Check cache
      const cached = scanCacheRef.current[sport];
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        setScanResults(prev => ({ ...prev, [sport]: cached.data }));
        isScanningRef.current = false;
        return cached.data;
      }

      setIsScanning(true);
      try {
        const result = await scanGames(sport);
        setScanResults(prev => ({ ...prev, [sport]: result }));
        scanCacheRef.current[sport] = { data: result, timestamp: Date.now() };

        // Fetch sparkline data for all games with tokens
        const tokenIds = result.games
          .filter((g) => g.clobTokenId)
          .map((g) => g.clobTokenId!);

        // Batch fetch price histories — use ref to avoid stale closure
        for (const tokenId of tokenIds) {
          if (!priceHistoriesRef.current[tokenId]) {
            fetchPriceHistory(tokenId, "1d", 60)
              .then((history) => {
                setPriceHistories((prev) => ({ ...prev, [tokenId]: history }));
              })
              .catch(() => {});
          }
        }

        return result;
      } catch (err: any) {
        if (showToast) toast({ title: "Scan failed", description: err.message, variant: "destructive" });
        return null;
      } finally {
        setIsScanning(false);
        isScanningRef.current = false;
      }
    },
    [toast]
  );

  const handleRefresh = () => {
    // Clear cache for current sport
    delete scanCacheRef.current[activeSport];
    doScan(activeSport);
  };

  const handleSportChange = (sport: Sport) => {
    setActiveSport(sport);
    doScan(sport);
  };

  const handleExpandGame = (game: any) => {
    if (game.clobTokenId && !priceHistories[game.clobTokenId]) {
      fetchPriceHistory(game.clobTokenId, "1w", 30)
        .then((history) => {
          setPriceHistories((prev) => ({ ...prev, [game.clobTokenId!]: history }));
        })
        .catch(() => {});
    }
  };

  const handleChartIntervalChange = (tokenId: string, interval: "1d" | "1w") => {
    if (!tokenId) return;
    const fidelity = interval === "1d" ? 60 : 30;
    fetchPriceHistory(tokenId, interval === "1d" ? "1d" : "1w", fidelity)
      .then((history) => {
        setPriceHistories((prev) => ({ ...prev, [tokenId]: history }));
      })
      .catch(() => {});
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Auto-scan on load
  useEffect(() => {
    doScan(activeSport, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scan interval
  useEffect(() => {
    if (!settings.autoScan) {
      setNextScanIn(null);
      return;
    }

    let countdown = settings.scanFrequency * 60;
    setNextScanIn(countdown);

    const countdownTimer = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        countdown = settings.scanFrequency * 60;
        // Scan each enabled sport — Slack alerts handled server-side by scan-edges cron
        (async () => {
          for (const sport of settings.sportsToMonitor) {
            delete scanCacheRef.current[sport];
            await doScan(sport, false);
          }
        })();
      }
      setNextScanIn(countdown);
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [settings.autoScan, settings.scanFrequency, settings.sportsToMonitor, doScan]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">PE</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">PolyEdge</h1>
          </div>
          <SportTabs activeSport={activeSport} onSportChange={handleSportChange} />
          <Link to="/tracker" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Edge Tracker
          </Link>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      {/* Status Bar */}
      <StatusBar
        scanResult={scanResult}
        isScanning={isScanning}
        edgeThreshold={settings.edgeThreshold}
        autoScan={settings.autoScan}
        scanFrequency={settings.scanFrequency}
        nextScanIn={nextScanIn}
        onRefresh={handleRefresh}
      />

      {/* Game Table */}
      <GameTable
        games={scanResult?.games || []}
        priceHistories={priceHistories}
        edgeThreshold={settings.edgeThreshold}
        minVolume={settings.minVolume}
        isLoading={isScanning}
        onExpandGame={handleExpandGame}
        onChartIntervalChange={handleChartIntervalChange}
      />

      {/* Unmatched Section */}
      {scanResult && (
        <UnmatchedSection
          polymarketOnly={scanResult.unmatched.polymarketOnly}
          booksOnly={scanResult.unmatched.booksOnly}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default Index;
