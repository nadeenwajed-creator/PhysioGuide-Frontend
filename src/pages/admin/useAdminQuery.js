import { useCallback, useEffect, useState } from 'react';
import { callAdmin } from '../../services/adminService.js';

// Loads one admin operation and reloads when its parameters change. The previous
// rows stay on screen while new ones arrive, so filters never blank the table;
// an error state is cleared as soon as a retry starts.
export default function useAdminQuery(method, params = {}, { enabled = true } = {}) {
  const key = JSON.stringify(params);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ requestKey: null, data: null, error: null });
  // Every attempt gets its own key so a stale response can never win.
  const requestKey = `${key}#${attempt}`;

  useEffect(() => {
    // Optional queries (a deep link that may be absent) stay idle.
    if (!enabled) return undefined;
    let live = true;

    callAdmin(method, JSON.parse(key))
      .then((data) => {
        if (live) setState({ requestKey, data, error: null });
      })
      .catch((error) => {
        if (live) setState({ requestKey, data: null, error });
      });

    return () => {
      live = false;
    };
  }, [enabled, method, key, attempt, requestKey]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  // A response only belongs to the current filters once its key matches, so an
  // error clears as soon as the user retries or changes a filter.
  const current = state.requestKey === requestKey;

  return {
    data: enabled ? state.data : null,
    error: enabled && current ? state.error : null,
    loading: enabled ? (current ? !state.data && !state.error : !state.data) : false,
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

// Localized failure text: falls back to the generic admin message when the
// error code has no dedicated copy.
export function errorText(t, error) {
  const code = error?.code || 'network';
  const message = t(`center.error.${code}`);
  return message === `center.error.${code}` ? t('admin.state.error') : message;
}
