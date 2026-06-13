import { useCallback } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import { useAutoRefresh } from "./hooks.js";
import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";

function Logo() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/25 to-indigo-500/15 ring-1 ring-sky-400/30">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-400" fill="none" aria-hidden="true">
        <path
          d="M12 2 4 5.5v5c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11v-5L12 2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 13.2v3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ModeBadge() {
  const fetchHealth = useCallback(() => api.health(), []);
  const { data: health } = useAutoRefresh(fetchHealth);
  if (!health) return null;
  const live = health.mode !== "demo";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${
        live
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
          : "bg-violet-500/10 text-violet-300 ring-violet-500/30"
      }`}
      title={
        health.last_poll_error
          ? `Last poll error: ${health.last_poll_error}`
          : `Last poll: ${health.last_poll_at ?? "never"}`
      }
    >
      <span
        className={`pulse-dot h-1.5 w-1.5 rounded-full ${
          live ? "bg-emerald-400 text-emerald-400" : "bg-violet-400 text-violet-400"
        }`}
      />
      {live ? `live · ${health.mode}` : "demo mode"}
      {health.last_poll_error && " ⚠"}
    </span>
  );
}

const navClass = ({ isActive }) =>
  `relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-slate-800/80 text-white ring-1 ring-slate-700"
      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
  }`;

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight text-white">
                Tatzpit<span className="text-sky-400">.</span>
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                תצפית · observation post
              </span>
            </div>
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
