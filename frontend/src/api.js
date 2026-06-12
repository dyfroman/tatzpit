const BASE = import.meta.env.VITE_API_BASE || "";

async function get(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${path}`);
  }
  return res.json();
}

export const api = {
  alerts: (params) => get("/api/alerts", params),
  alertDetail: (id) => get(`/api/alerts/${id}`),
  summary: (params) => get("/api/stats/summary", params),
  topRules: (params) => get("/api/stats/top-rules", params),
  topAgents: (params) => get("/api/stats/top-agents", params),
  timeline: (params) => get("/api/stats/timeline", params),
  health: () => get("/api/stats/health"),
};
