import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data with `load` when `deps` change.
//  - `reload()` fetches again without clearing what is already shown.
//  - `pollMs` refetches on an interval while the tab is visible, for live
//    views such as the queue. Polling failures keep the last good data.
//  - `setData` lets a screen apply an optimistic change immediately.
export function useFetch(load, deps, { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, error: null, loading: true }));
    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  useEffect(() => {
    if (!pollMs) return undefined;
    let cancelled = false;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadRef
        .current()
        .then((data) => {
          if (!cancelled) setState((prev) => ({ ...prev, data, error: null }));
        })
        .catch(() => {});
    };
    const timer = setInterval(tick, pollMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (update) =>
      setState((prev) => ({
        ...prev,
        data: typeof update === 'function' ? update(prev.data) : update,
      })),
    [],
  );

  return { ...state, reload, setData };
}
