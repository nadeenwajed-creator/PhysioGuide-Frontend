import { useEffect, useSyncExternalStore } from 'react';
import { getAuthSnapshot, subscribeAuth, restoreSession } from '../services/authService.js';

export function useAuth() {
  const state = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);
  useEffect(() => { restoreSession(); }, []);
  return state;
}
