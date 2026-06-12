import { SEVERITY_META } from "../severity.js";

export default function SeverityBadge({ severity, level }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.low;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}
    >
      {meta.label}
      {level !== undefined && <span className="opacity-60">L{level}</span>}
    </span>
  );
}
