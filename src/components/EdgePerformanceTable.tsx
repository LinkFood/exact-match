import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BucketRow {
  edge_bucket: string;
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  avg_edge: number;
  avg_volume: number;
}

export function EdgePerformanceTable() {
  const [rows, setRows] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("edge_performance" as any)
        .select("*");
      if (!error && data) {
        setRows(data as unknown as BucketRow[]);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="h-32 animate-pulse bg-secondary rounded" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Edge Performance</h3>
        <p className="text-xs text-muted-foreground">No settled games yet. Performance data will appear after games are settled.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Edge Performance by Bucket</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="text-left px-4 py-2">Edge Bucket</th>
            <th className="text-right px-4 py-2">Games</th>
            <th className="text-right px-4 py-2">W</th>
            <th className="text-right px-4 py-2">L</th>
            <th className="text-right px-4 py-2">Win Rate</th>
            <th className="text-right px-4 py-2">Avg Edge</th>
            <th className="text-right px-4 py-2">Avg Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.edge_bucket} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-mono font-semibold">{row.edge_bucket}</td>
              <td className="text-right px-4 py-2 font-mono">{row.total_games}</td>
              <td className="text-right px-4 py-2 font-mono text-[hsl(var(--edge-green))]">{row.wins}</td>
              <td className="text-right px-4 py-2 font-mono text-[hsl(var(--edge-red))]">{row.losses}</td>
              <td className="text-right px-4 py-2 font-mono font-semibold">
                {row.win_rate !== null ? `${row.win_rate}%` : "—"}
              </td>
              <td className="text-right px-4 py-2 font-mono">{row.avg_edge}%</td>
              <td className="text-right px-4 py-2 font-mono text-muted-foreground">
                ${row.avg_volume?.toLocaleString() || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
