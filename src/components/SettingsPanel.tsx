import { useState } from "react";
import { Settings, Sport } from "@/types/polyedge";
import { sendSlackAlert } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const THRESHOLD_OPTIONS = [2, 3, 5, 7, 10];
const FREQUENCY_OPTIONS = [15, 30, 60];
const VOLUME_OPTIONS = [
  { label: "No minimum", value: 0 },
  { label: "$1K+", value: 1000 },
  { label: "$5K+", value: 5000 },
  { label: "$10K+", value: 10000 },
];

export function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>({ ...settings });
  const { toast } = useToast();

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      onSave(next);
      return next;
    });
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleTestSlack = async () => {
    if (!draft.slackWebhookUrl) {
      toast({ title: "No webhook URL", description: "Add a Slack webhook URL first", variant: "destructive" });
      return;
    }
    try {
      await sendSlackAlert(draft.slackWebhookUrl, {
        awayTeam: "Test Away",
        homeTeam: "Test Home",
        polyTeam: "Test",
        polyPrice: 0.65,
        bookConsensus: 0.70,
        edgePercent: "+5.0%",
        signalExplanation: "This is a test alert from PolyEdge",
        polyMarketUrl: "https://polymarket.com",
        tipoff: new Date().toISOString(),
      });
      toast({ title: "Test alert sent!", description: "Check your Slack channel" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleSport = (sport: Sport) => {
    const current = draft.sportsToMonitor;
    if (current.includes(sport)) {
      if (current.length > 1) {
        update("sportsToMonitor", current.filter((s) => s !== sport));
      }
    } else {
      update("sportsToMonitor", [...current, sport]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border-l border-border overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Settings</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Odds API Key */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              The Odds API Key
            </label>
            <input
              type="password"
              value={draft.oddsApiKey}
              onChange={(e) => update("oddsApiKey", e.target.value)}
              placeholder="Paste your API key"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <a
              href="https://the-odds-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Get free key →
            </a>
          </div>

          {/* Slack Webhook */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Slack Webhook URL
            </label>
            <input
              type="password"
              value={draft.slackWebhookUrl}
              onChange={(e) => update("slackWebhookUrl", e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                How to set up →
              </a>
              <button
                onClick={handleTestSlack}
                className="text-xs px-2 py-1 bg-secondary border border-border rounded hover:bg-accent"
              >
                Send test alert
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚡ Alerts run server-side every 5 minutes, even when browser is closed. Edges ≥3% with $1K+ volume trigger alerts.
            </p>
          </div>

          {/* Edge Threshold */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Edge Threshold
            </label>
            <div className="flex gap-1">
              {THRESHOLD_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => update("edgeThreshold", t)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    draft.edgeThreshold === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Scan */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Auto-Scan
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => update("autoScan", !draft.autoScan)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  draft.autoScan ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${
                    draft.autoScan ? "translate-x-5" : ""
                  }`}
                />
              </button>
              <span className="text-sm">{draft.autoScan ? "ON" : "OFF"}</span>
            </div>
            {draft.autoScan && (
              <div className="flex gap-1">
                {FREQUENCY_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => update("scanFrequency", f)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      draft.scanFrequency === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f} min
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sports */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sports to Monitor
            </label>
            <div className="flex gap-2">
              {(["ncaab", "nba", "nfl"] as Sport[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={draft.sportsToMonitor.includes(s)}
                    onChange={() => toggleSport(s)}
                    className="rounded border-border"
                  />
                  {s.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Min Volume */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Minimum Volume
            </label>
            <div className="flex gap-1 flex-wrap">
              {VOLUME_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => update("minVolume", v.value)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    draft.minVolume === v.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
