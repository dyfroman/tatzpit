import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAutoRefresh } from "../hooks.js";
import { SEVERITIES, SEVERITY_META } from "../severity.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import LastUpdated from "../components/LastUpdated.jsx";
import JsonViewer from "../components/JsonViewer.jsx";

const PAGE_SIZE = 25;
const TIME_RANGES = [
  { label: "Last hour", hours: 1 },
  { label: "Last 6h", hours: 6 },
  { label: "Last 24h", hours: 24 },
  { label: "Last 7 days", hours: 168 },
  { label: "All time", hours: 0 },
];

function sinceFromHours(hours) {
  if (!hours) return undefined;
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function AlertDrawer({ alertId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    api.alertDetail(alertId).then(setDetail).catch(setError);
  }, [alertId]);

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="animate-slide-in absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-slate-700/70 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Alert detail</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            ✕ close
          </button>
        </div>
        {error && <div className="text-rose-400">Failed to load: {error.message}</div>}
        {!detail && !error && <div className="text-slate-500">Loading…</div>}
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <SeverityBadge severity={detail.severity} level={detail.rule_level} />
              <span className="font-mono text-xs text-slate-500">{detail.wazuh_id}</span>
            </div>
            <p className="text-slate-200">{detail.rule_description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
              <dt className="text-slate-500">Timestamp</dt>
              <dd className="font-mono text-xs text-slate-300">{detail.timestamp}</dd>
              <dt className="text-slate-500">Agent</dt>
              <dd className="text-slate-300">
                {detail.agent_name || "(manager)"}{" "}
                <span className="text-slate-500">#{detail.agent_id}</span>
              </dd>
              <dt className="text-slate-500">Rule</dt>
              <dd className="font-mono text-slate-300">{detail.rule_id}</dd>
              <dt className="text-slate-500">Groups</dt>
              <dd className="text-slate-300">{detail.rule_groups || "—"}</dd>
              <dt className="text-slate-500">Location</dt>
              <dd className="break-all font-mono text-xs text-slate-300">{detail.location || "—"}</dd>
            </dl>
            {detail.mitre_ids && (
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-400">
                  MITRE ATT&CK
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">Tactic:</span> {detail.mitre_tactics || "—"}
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">Technique:</span>{" "}
                  {detail.mitre_techniques || "—"}{" "}
                  <span className="font-mono text-xs text-violet-400">({detail.mitre_ids})</span>
                </div>
              </div>
            )}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Raw alert JSON
              </div>
              <JsonViewer json={detail.raw} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const selectClass =
  "rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-sm text-slate-200 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20";

function SortHeader({ label, field, sortBy, order, onSort, className = "" }) {
  const active = sortBy === field;
  return (
    <th
      className={`cursor-pointer select-none pb-2 pr-3 font-medium hover:text-slate-300 ${className}`}
      onClick={() => onSort(field)}
    >
      {label} {active && (order === "desc" ? "▼" : "▲")}
    </th>
  );
}

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [agents, setAgents] = useState([]);

  const severity = searchParams.get("severity") ?? "";
  const agent = searchParams.get("agent") ?? "";
  const ruleId = searchParams.get("rule_id") ?? "";
  const search = searchParams.get("search") ?? "";
  const hours = Number(searchParams.get("hours") ?? 24);
  const sortBy = searchParams.get("sort_by") ?? "timestamp";
  const order = searchParams.get("order") ?? "desc";

  const setParam = (key, value) => {
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const onSort = (field) => {
    if (sortBy === field) setParam("order", order === "desc" ? "asc" : "desc");
    else {
      setParam("sort_by", field);
      setParam("order", "desc");
    }
  };

  useEffect(() => {
    api.topAgents({ hours: 720, limit: 50 }).then(setAgents).catch(() => {});
  }, []);

  const fetchAlerts = useCallback(
    () =>
      api.alerts({
        severity: severity || undefined,
        agent: agent || undefined,
        rule_id: ruleId || undefined,
        search: search || undefined,
        since: sinceFromHours(hours),
        sort_by: sortBy,
        order,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    [severity, agent, ruleId, search, hours, sortBy, order, page]
  );
  const { data, error, lastUpdated, refresh } = useAutoRefresh(fetchAlerts);

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">
          Alerts{" "}
          <span className="text-sm font-normal tabular-nums text-slate-500">
            ({total} matching)
          </span>
        </h1>
        <LastUpdated lastUpdated={lastUpdated} error={error} onRefresh={refresh} />
      </div>

      <div className="surface flex flex-wrap items-center gap-2 rounded-xl p-3">
        <select value={severity} onChange={(e) => setParam("severity", e.target.value)} className={selectClass}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_META[s].label}
            </option>
          ))}
        </select>
        <select value={agent} onChange={(e) => setParam("agent", e.target.value)} className={selectClass}>
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.agent_name} value={a.agent_name}>
              {a.agent_name || "(manager)"}
            </option>
          ))}
        </select>
        <select value={hours} onChange={(e) => setParam("hours", e.target.value)} className={selectClass}>
          {TIME_RANGES.map((r) => (
            <option key={r.hours} value={r.hours}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          value={ruleId}
          onChange={(e) => setParam("rule_id", e.target.value)}
          placeholder="Rule ID"
          className={`${selectClass} w-24`}
        />
        <input
          value={search}
          onChange={(e) => setParam("search", e.target.value)}
          placeholder="Search description…"
          className={`${selectClass} min-w-48 flex-1`}
        />
        {(severity || agent || ruleId || search) && (
          <button
            onClick={() => setSearchParams({})}
            className="text-xs text-slate-500 underline hover:text-slate-300"
          >
            clear filters
          </button>
        )}
      </div>

      <div className="surface overflow-x-auto rounded-xl p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
              <SortHeader label="Time (UTC)" field="timestamp" {...{ sortBy, order, onSort }} />
              <SortHeader label="Severity" field="severity" {...{ sortBy, order, onSort }} />
              <SortHeader label="Agent" field="agent_name" {...{ sortBy, order, onSort }} />
              <SortHeader label="Rule" field="rule_id" {...{ sortBy, order, onSort }} />
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">MITRE</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="cursor-pointer border-b border-slate-800/60 transition-colors hover:bg-slate-800/40"
              >
                <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-slate-400">
                  {a.timestamp.slice(0, 19).replace("T", " ")}
                </td>
                <td className="py-2 pr-3">
                  <SeverityBadge severity={a.severity} level={a.rule_level} />
                </td>
                <td className="py-2 pr-3 text-slate-300">{a.agent_name || "(manager)"}</td>
                <td className="py-2 pr-3 font-mono text-xs text-slate-400">{a.rule_id}</td>
                <td className="max-w-md truncate py-2 pr-3 text-slate-200" title={a.rule_description}>
                  {a.rule_description}
                </td>
                <td className="whitespace-nowrap py-2 font-mono text-xs text-violet-400">
                  {a.mitre_ids ? a.mitre_ids.split(",")[0] : ""}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  No alerts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span className="tabular-nums">
          Page {page + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-700 px-3 py-1 transition-colors disabled:opacity-40 enabled:hover:bg-slate-800 enabled:hover:text-slate-200"
          >
            ← Prev
          </button>
          <button
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-700 px-3 py-1 transition-colors disabled:opacity-40 enabled:hover:bg-slate-800 enabled:hover:text-slate-200"
          >
            Next →
          </button>
        </div>
      </div>

      {selectedId !== null && (
        <AlertDrawer alertId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
