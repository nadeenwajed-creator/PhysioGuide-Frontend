// Stores the session returned by the backend after a successful sign-in.
// Only the current user's session is kept; passwords are never persisted.
const SESSION_KEY = 'physioguide-session';

// Saves the session and ignores storage failures (private mode, quota).
export function saveSession(session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sign-in still works when storage is unavailable.
  }
}

// Returns the stored session, or null when nothing usable is stored.
export function loadSession() {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored);
    return session && typeof session === 'object' ? session : null;
  } catch {
    return null;
  }
}

// Removes the stored session on sign-out.
export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}