// Severity buckets derived from Wazuh rule levels:
// 12+ critical, 7-11 high, 4-6 medium, 0-3 low.
export const SEVERITIES = ["critical", "high", "medium", "low"];

export const SEVERITY_META = {
  critical: {
    label: "Critical",
    chart: "#f43f5e",
    text: "text-rose-400",
    badge: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    card: "border-rose-500/40",
  },
  high: {
    label: "High",
    chart: "#fb923c",
    text: "text-orange-400",
    badge: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
    card: "border-orange-500/40",
  },
  medium: {
    label: "Medium",
    chart: "#facc15",
    text: "text-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
    card: "border-yellow-500/40",
  },
  low: {
    label: "Low",
    chart: "#38bdf8",
    text: "text-sky-400",
    badge: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
    card: "border-sky-500/40",
  },
};
