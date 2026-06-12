import { useCallback } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import { useAutoRefresh } from "./hooks.js";
import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";

function ModeBadge() {
  const fetchHealth = useCallback(() => api.health(), []);
  const { data: health } = useAutoRefresh(fetchHealth);
  if (!health) return null;
  const live = health.mode !== "demo";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
        live
          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
          : "bg-violet-500/10 text-violet-400 ring-violet-500/30"
      }`}
      title={
        health.last_poll_error
          ? `Last poll error: ${health.last_poll_error}`
          : `Last poll: ${health.last_poll_at ?? "never"}`
      }
    >
      {live ? `live · ${health.mode}` : "demo mode"}
      {health.last_poll_error && " ⚠"}
    </span>
  );
}

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
  }`;

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-white">
              Tatzpit<span className="text-sky-400">.</span>
            </span>
            <span className="hidden text-xs text-slate-500 sm:inline">
              תצפית · observation post
            </span>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/dashboard" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/alerts" className={navClass}>
              Alerts
            </NavLink>
          </nav>
          <div className="ml-auto">
            <ModeBadge />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </main>
    </div>
  );
}
