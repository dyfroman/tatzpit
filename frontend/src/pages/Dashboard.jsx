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

function SeverityCard({ severity, count }) {
  const meta = SEVERITY_META[severity];
  return (
    <Link
      to={`/alerts?severity=${severity}`}
      className={`rounded-xl border bg-slate-900/60 p-4 transition-colors hover:bg-slate-900 ${meta.card}`}
    >
      <div className={`text-xs font-semibold uppercase tracking-wider ${meta.text}`}>
        {meta.label}
      </div>
      <div className="mt-1 text-3xl font-bold text-white">{count}</div>
      <div className="mt-1 text-xs text-slate-500">last 24h</div>
    </Link>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-slate-400">{label?.slice(11, 16)} UTC</div>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.fill }}>{SEVERITY_META[p.dataKey].label}</span>
            <span className="text-slate-200">{p.value}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Security Overview</h1>
        <LastUpdated lastUpdated={lastUpdated} error={error} onRefresh={refresh} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SEVERITIES.map((sev) => (
          <SeverityCard key={sev} severity={sev} count={summary.by_severity[sev]} />
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Alerts over time <span className="font-normal text-slate-500">· last 24h, hourly</span>
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeline} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(b) => b.slice(11, 16)}
                tick={{ fill: "#64748b", fontSize: 11 }}
                stroke="#334155"
                interval={3}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {[...SEVERITIES].reverse().map((sev) => (
                <Area
                  key={sev}
                  type="monotone"
                  dataKey={sev}
                  stackId="1"
                  stroke={SEVERITY_META[sev].chart}
                  fill={SEVERITY_META[sev].chart}
                  fillOpacity={0.35}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Top triggered rules</h2>
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
                <tr key={r.rule_id + r.severity} className="border-b border-slate-800/60">
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
                  <td className="py-2 text-right font-mono text-slate-300">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Noisiest agents</h2>
          <div className="space-y-3">
            {topAgents.map((a) => (
              <Link key={a.agent_name} to={`/alerts?agent=${a.agent_name}`} className="block">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-200">{a.agent_name || "(manager)"}</span>
                  <span className="font-mono text-slate-400">{a.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className="h-1.5 rounded-full bg-sky-500/70"
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
