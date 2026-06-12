import { useEffect, useState } from "react";
import { REFRESH_INTERVAL_MS } from "../hooks.js";

export default function LastUpdated({ lastUpdated, error, onRefresh }) {
  // Re-render every second so the "Xs ago" label stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const seconds = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {error ? (
        <span className="text-rose-400">refresh failed: {error.message}</span>
      ) : (
        <span>
          {seconds === null ? "loading…" : `updated ${seconds}s ago`} · auto-refresh{" "}
          {REFRESH_INTERVAL_MS / 1000}s
        </span>
      )}
      <button
        onClick={onRefresh}
        className="rounded border border-slate-700 px-2 py-0.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
      >
        refresh
      </button>
    </div>
  );
}
