import { Sport } from "@/types/polyedge";

interface SportTabsProps {
  activeSport: Sport;
  onSportChange: (sport: Sport) => void;
}

const SPORTS: { key: Sport; label: string }[] = [
  { key: "ncaab", label: "NCAAB" },
  { key: "nba", label: "NBA" },
  { key: "nfl", label: "NFL" },
];

export function SportTabs({ activeSport, onSportChange }: SportTabsProps) {
  return (
    <div className="flex gap-1">
      {SPORTS.map((s) => (
        <button
          key={s.key}
          onClick={() => onSportChange(s.key)}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
            activeSport === s.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
