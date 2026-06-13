// Severity buckets derived from Wazuh rule levels:
// 12+ critical, 7-11 high, 4-6 medium, 0-3 low.
export const SEVERITIES = ["critical", "high", "medium", "low"];

export const SEVERITY_META = {
  critical: {
    label: "Critical",
    chart: "#f43f5e",
    accent: "#fb7185",
    glow: "rgba(244, 63, 94, 0.45)",
    text: "text-rose-400",
    badge: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    card: "border-rose-500/40",
    bar: "from-rose-500 to-rose-400",
  },
  high: {
    label: "High",
    chart: "#fb923c",
    accent: "#fdba74",
    glow: "rgba(251, 146, 60, 0.4)",
    text: "text-orange-400",
    badge: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    card: "border-orange-500/40",
    bar: "from-orange-500 to-amber-400",
  },
  medium: {
    label: "Medium",
    chart: "#facc15",
    accent: "#fde047",
    glow: "rgba(250, 204, 21, 0.35)",
    text: "text-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
    card: "border-yellow-500/40",
    bar: "from-yellow-500 to-yellow-300",
  },
  low: {
    label: "Low",
    chart: "#38bdf8",
    accent: "#7dd3fc",
    glow: "rgba(56, 189, 248, 0.35)",
    text: "text-sky-400",
    badge: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    card: "border-sky-500/40",
    bar: "from-sky-500 to-cyan-400",
  },
};
