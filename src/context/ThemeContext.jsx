import { createContext, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext(null);
const storageKey = 'physioguide-theme';

// One provider owns the theme for the entire application.
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    // Restore a valid choice after refresh within the same tab session.
    try {
      const savedTheme = window.sessionStorage.getItem(storageKey);

      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // The application still works when browser storage is unavailable.
    }

    return null;
  });

  // No saved preference means Light mode.
  const theme = preference ?? 'light';

  useLayoutEffect(() => {
    // Root variables also reach dropdowns and dialogs rendered outside #root.
    document.documentElement.dataset.theme = theme;

    try {
      if (preference === null) {
        window.sessionStorage.removeItem(storageKey);
      } else {
        window.sessionStorage.setItem(storageKey, preference);
      }
    } catch {
      // Keep the in-memory theme working without storage persistence.
    }
  }, [preference, theme]);

  // Functional updates keep consecutive theme changes consistent.
  function toggleTheme() {
    setPreference((currentPreference) => (
      currentPreference === 'dark' ? 'light' : 'dark'
    ));
  }

  function resetTheme() {
    // Clear storage immediately before a future logout navigation.
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Reset the visible theme even if storage access is blocked.
    }

    // The effect removes the preference instead of writing Light back.
    setPreference(null);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Keep the context and its provider in the single approved context file.
export default ThemeContext;