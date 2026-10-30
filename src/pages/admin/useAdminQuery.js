import { useCallback, useEffect, useState } from 'react';
import { callAdmin } from '../../services/adminService.js';

// Loads one admin operation and reloads when its parameters change. The previous
// rows stay on screen while new ones arrive, so filters never blank the table;
// an error state is cleared as soon as a retry starts.
export default function useAdminQuery(method, params = {}) {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState((current) => (current.error ? { data: null, error: null } : current));

    callAdmin(method, JSON.parse(key))
      .then((data) => {
        if (live) setState({ data, error: null });
      })
      .catch((error) => {
        if (live) setState({ data: null, error });
      });

    return () => {
      live = false;
    };
  }, [method, key, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return {
    data: state.data,
    error: state.error,
    loading: !state.data && !state.error,
    reload,
  };
}

// Search inputs re-query through this debounce so typing does not spam the API.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Keeps a just-chosen status visible while its mutation runs, then drops it
// once the refetched row confirms the same value. A failure calls revert().
export function useStatusOverride() {
  const [overrides, setOverrides] = useState({});

  const begin = useCallback((id, status) => {
    setOverrides((previous) => ({ ...previous, [id]: status }));
  }, []);

  const revert = useCallback((id) => {
    setOverrides((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }, []);

  const reconcile = useCallback((rows = []) => {
    setOverrides((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const [id, status] of Object.entries(previous)) {
        if (rows.some((row) => row.id === id && row.status === status)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, []);

  return { begin, revert, reconcile };
}

// Localized failure text: falls back to the generic admin message when the
// error code has no dedicated copy.
export function errorText(t, error) {
  const code = error?.code || 'network';
  const message = t(`center.error.${code}`);
  return message === `center.error.${code}` ? t('admin.state.error') : message;
}
