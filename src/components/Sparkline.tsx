import { PricePoint } from "@/types/polyedge";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: PricePoint[];
  bookConsensus: number;
}

export function Sparkline({ data, bookConsensus }: SparklineProps) {
  if (!data || data.length < 2) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const first = data[0].p;
  const last = data[data.length - 1].p;
  const trendingToward = Math.abs(last - bookConsensus) < Math.abs(first - bookConsensus);
  const color = trendingToward
    ? "hsl(145, 100%, 45%)"
    : last === first
    ? "hsl(240, 10%, 52%)"
    : "hsl(0, 100%, 66%)";

  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
