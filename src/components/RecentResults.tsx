import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SettledGame {
  id: string;
  home_team: string;
  away_team: string;
  edge_pct: number;
  poly_price: number | null;
  book_consensus: number;
  result: string;
  edge_team_won: boolean;
  edge_team: string;
  settled_at: string;
}

export function RecentResults() {
  const [games, setGames] = useState<SettledGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("edge_scans" as any)
        .select("*")
        .not("result", "is", null)
        .order("settled_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        setGames(data as unknown as SettledGame[]);
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

  if (games.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Recent Results</h3>
        <p className="text-xs text-muted-foreground">No settled games yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Recent Results</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="text-left px-4 py-2">Game</th>
            <th className="text-right px-4 py-2">Edge</th>
            <th className="text-right px-4 py-2">Poly</th>
            <th className="text-right px-4 py-2">Books</th>
            <th className="text-center px-4 py-2">Result</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2">
                <span className="font-medium">{game.away_team}</span>
                <span className="text-muted-foreground mx-1">vs</span>
                <span>{game.home_team}</span>
              </td>
              <td className="text-right px-4 py-2 font-mono font-semibold">
                {game.edge_pct > 0 ? "+" : ""}{game.edge_pct.toFixed(1)}%
              </td>
              <td className="text-right px-4 py-2 font-mono">
                {game.poly_price !== null ? `${(game.poly_price * 100).toFixed(0)}¢` : "—"}
              </td>
              <td className="text-right px-4 py-2 font-mono">
                {(game.book_consensus * 100).toFixed(1)}%
              </td>
              <td className="text-center px-4 py-2">
                {game.edge_team_won ? (
                  <span className="text-[hsl(var(--edge-green))] font-bold">✅</span>
                ) : (
                  <span className="text-[hsl(var(--edge-red))] font-bold">❌</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
