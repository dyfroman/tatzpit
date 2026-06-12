import { useCallback, useEffect, useRef, useState } from "react";

export const REFRESH_INTERVAL_MS = 30_000;

/**
 * Polls `fetchFn` immediately and then every `intervalMs`.
 * `fetchFn` must be stable (wrap it in useCallback) — it is also the
 * dependency that triggers an immediate re-fetch when filters change.
 */
export function useAutoRefresh(fetchFn, intervalMs = REFRESH_INTERVAL_MS) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setData(await fetchFn());
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, error, lastUpdated, refresh };
}
