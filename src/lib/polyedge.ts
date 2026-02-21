import { Settings, DEFAULT_SETTINGS } from "@/types/polyedge";

const STORAGE_KEY = "polyedge-settings";

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function formatVolume(volume: number | null): string {
  if (volume === null || volume === 0) return "—";
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

export function formatTipoff(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatTeamWithRank(team: string, rank: number | null, abbr?: string): string {
  return rank ? `#${rank} ${team}` : team;
}
