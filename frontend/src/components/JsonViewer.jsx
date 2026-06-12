// Minimal recursive JSON renderer with syntax coloring.
function Value({ value, depth }) {
  if (value === null) return <span className="text-slate-500">null</span>;
  if (typeof value === "boolean")
    return <span className="text-violet-400">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-amber-400">{value}</span>;
  if (typeof value === "string")
    return <span className="text-emerald-400">"{value}"</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span>[]</span>;
    return (
      <>
        {"["}
        {value.map((v, i) => (
          <div key={i} style={{ paddingLeft: 16 }}>
            <Value value={v} depth={depth + 1} />
            {i < value.length - 1 && ","}
          </div>
        ))}
        {"]"}
      </>
    );
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return <span>{"{}"}</span>;
  return (
    <>
      {"{"}
      {entries.map(([k, v], i) => (
        <div key={k} style={{ paddingLeft: 16 }}>
          <span className="text-sky-400">"{k}"</span>
          <span className="text-slate-500">: </span>
          <Value value={v} depth={depth + 1} />
          {i < entries.length - 1 && ","}
        </div>
      ))}
      {"}"}
    </>
  );
}

export default function JsonViewer({ json }) {
  let parsed;
  try {
    parsed = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return <pre className="text-xs text-slate-300">{String(json)}</pre>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 font-mono text-xs leading-5 text-slate-300">
      <Value value={parsed} depth={0} />
    </div>
  );
}
