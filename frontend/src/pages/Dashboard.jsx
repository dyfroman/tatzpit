import { useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api.js";
import { useAutoRefresh } from "../hooks.js";
import { SEVERITIES, SEVERITY_META } from "../severity.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import LastUpdated from "../components/LastUpdated.jsx";

const SEVERITY_ICON = {
  critical: "M12 2 1 21h22L12 2Zm0 6 6.5 11h-13L12 8Zm-1 4v3h2v-3h-2Zm0 4v2h2v-2h-2Z",
  high: "M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z",
  medium: "M3 13h2v8H3v-8Zm4-4h2v12H7V9Zm4-4h2v16h-2V5Zm4 8h2v8h-2v-8Zm4-4h2v12h-2V9Z",
  low: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0V8a1 1 0 0 1 1-1Zm0 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
};

function SeverityCard({ severity, count, total }) {
  const meta = SEVERITY_META[severity];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Link
      to={`/alerts?severity=${severity}`}
      className="surface surface-hover group relative overflow-hidden rounded-2xl p-4"
      style={{ "--glow": meta.glow }}
    >
      {/* gradient accent strip */}
      <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${meta.bar}`} />
      <div className="flex items-start justify-between">
        <div className={`text-xs font-semibold uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </div>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition-shadow group-hover:shadow-[0_0_18px_-2px_var(--glow)]"
          style={{ color: meta.accent, background: `${meta.accent}1a`, borderColor: `${meta.accent}33` }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d={SEVERITY_ICON[severity]} />
          </svg>
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-white">{count}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>last 24h</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
    </Link>
  );
}

function PanelHeading({ children, sub }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
      <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
      {children}
      {sub && <span className="font-normal text-slate-500">{sub}</span>}
    </h2>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-slate-400">{label?.slice(11, 16)} UTC</div>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.fill }}>{SEVERITY_META[p.dataKey].label}</span>
            <span className="text-slate-200 tabular-nums">{p.value}</span>
          </div>
        ))}
    </div>
  );
}

export default function Dashboard() {
  const fetchAll = useCallback(async () => {
    const [summary, timeline, topRules, topAgents] = await Promise.all([
      api.summary({ hours: 24 }),
      api.timeline({ hours: 24 }),
      api.topRules({ hours: 24, limit: 8 }),
      api.topAgents({ hours: 24, limit: 8 }),
    ]);
    return { summary, timeline, topRules, topAgents };
  }, []);
  const { data, error, lastUpdated, refresh } = useAutoRefresh(fetchAll);

  if (!data && !error) {
    return <div className="py-20 text-center text-slate-500">Loading dashboard…</div>;
  }
  if (!data) {
    return (
      <div className="py-20 text-center text-rose-400">
        Failed to load data: {error.message}. Is the backend running on port 8000?
      </div>
    );
  }

  const { summary, timeline, topRules, topAgents } = data;
  const maxAgentCount = Math.max(1, ...topAgents.map((a) => a.count));
  const total = SEVERITIES.reduce((sum, sev) => sum + (summary.by_severity[sev] ?? 0), 0);

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-white">Security Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-semibold tabular-nums text-slate-300">{total}</span> alerts in the
            last 24 hours
          </p>
        </div>
        <LastUpdated lastUpdated={lastUpdated} error={error} onRefresh={refresh} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SEVERITIES.map((sev) => (
          <SeverityCard
            key={sev}
            severity={sev}
            count={summary.by_severity[sev]}
            total={total}
          />
        ))}
      </div>

      <section className="surface rounded-2xl p-4">
        <PanelHeading sub="· last 24h, hourly">Alerts over time</PanelHeading>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeline} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                {SEVERITIES.map((sev) => (
                  <linearGradient key={sev} id={`grad-${sev}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEVERITY_META[sev].chart} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={SEVERITY_META[sev].chart} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(b) => b.slice(11, 16)}
                tick={{ fill: "#64748b", fontSize: 11 }}
                stroke="#334155"
                interval={3}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
              {[...SEVERITIES].reverse().map((sev) => (
                <Area
                  key={sev}
                  type="monotone"
                  dataKey={sev}
                  stackId="1"
                  stroke={SEVERITY_META[sev].chart}
                  fill={`url(#grad-${sev})`}
                  strokeWidth={1.8}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="surface rounded-2xl p-4 lg:col-span-3">
          <PanelHeading>Top triggered rules</PanelHeading>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-3 font-medium">Rule</th>
                <th className="pb-2 pr-3 font-medium">Severity</th>
                <th className="pb-2 text-right font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {topRules.map((r) => (
                <tr
                  key={r.rule_id + r.severity}
                  className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/30"
                >
                  <td className="py-2 pr-3">
                    <Link
                      to={`/alerts?rule_id=${r.rule_id}`}
                      className="text-slate-200 hover:text-sky-400"
                    >
                      <span className="mr-2 font-mono text-xs text-slate-500">{r.rule_id}</span>
                      {r.rule_description}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-slate-300">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="surface rounded-2xl p-4 lg:col-span-2">
          <PanelHeading>Noisiest agents</PanelHeading>
          <div className="space-y-3">
            {topAgents.map((a) => (
              <Link key={a.agent_name} to={`/alerts?agent=${a.agent_name}`} className="group block">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-200 group-hover:text-sky-400">
                    {a.agent_name || "(manager)"}
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">{a.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                    style={{ width: `${(a.count / maxAgentCount) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
