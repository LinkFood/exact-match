import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { settleGames } from "@/lib/api";
import { EdgePerformanceTable } from "@/components/EdgePerformanceTable";
import { RecentResults } from "@/components/RecentResults";
import { useToast } from "@/hooks/use-toast";

interface ScanStats {
  total: number;
  settled: number;
  pending: number;
  wins: number;
  losses: number;
  todayEdges: number;
}

const EdgeTracker = () => {
  const [stats, setStats] = useState<ScanStats>({
    total: 0, settled: 0, pending: 0, wins: 0, losses: 0, todayEdges: 0,
  });
  const [isSettling, setIsSettling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const todayStr = new Date().toISOString().split("T")[0];

    const [totalRes, settledRes, winsRes, todayRes] = await Promise.all([
      supabase.from("edge_scans").select("id", { count: "exact", head: true }),
      supabase.from("edge_scans").select("id", { count: "exact", head: true }).not("result", "is", null),
      supabase.from("edge_scans").select("id", { count: "exact", head: true }).eq("edge_team_won", true),
      supabase.from("edge_scans").select("id", { count: "exact", head: true }).eq("game_date", todayStr),
    ]);

    const queryError = totalRes.error || settledRes.error || winsRes.error || todayRes.error;
    if (queryError) {
      toast({ title: "Failed to load stats", description: queryError.message, variant: "destructive" });
      return;
    }

    const total = totalRes.count || 0;
    const settled = settledRes.count || 0;
    const wins = winsRes.count || 0;

    setStats({
      total,
      settled,
      pending: total - settled,
      wins,
      losses: settled - wins,
      todayEdges: todayRes.count || 0,
    });
  }

  async function handleSettle() {
    setIsSettling(true);
    try {
      const result = await settleGames();
      toast({ title: "Settlement complete", description: `${result.settled} games settled` });
      fetchStats();
    } catch (err: any) {
      toast({ title: "Settlement failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSettling(false);
    }
  }

  const winRate = stats.settled > 0 ? ((stats.wins / stats.settled) * 100).toFixed(1) : "—";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">PE</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">PolyEdge</h1>
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">Edge Tracker</span>
        </div>
        <button
          onClick={handleSettle}
          disabled={isSettling}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSettling ? "Settling..." : "Settle Games"}
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3 p-4">
        {[
          { label: "Total Tracked", value: stats.total },
          { label: "Settled", value: stats.settled },
          { label: "Pending", value: stats.pending },
          { label: "Win Rate", value: `${winRate}%` },
          { label: "Today's Edges", value: stats.todayEdges },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-xl font-bold font-mono mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-6">
        <EdgePerformanceTable />
        <RecentResults />
      </div>
    </div>
  );
};

export default EdgeTracker;
