import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
} from 'react';

import en from '../locales/en.js';
import ar from '../locales/ar.js';

const LanguageContext = createContext(null);
const storageKey = 'physioguide-language';

const translations = {
  en,
  ar,
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Restore only a supported language.
    try {
      const savedLanguage = window.localStorage.getItem(storageKey);

      if (savedLanguage === 'en' || savedLanguage === 'ar') {
        return savedLanguage;
      }
    } catch {
      // Use English when storage is unavailable.
    }

    return 'en';
  });

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useLayoutEffect(() => {
    // This provider is the only owner of the page language and direction.
    document.documentElement.lang = language;
    document.documentElement.dir = dir;

    try {
      window.localStorage.setItem(storageKey, language);
    } catch {
      // Switching still works when the browser blocks storage.
    }
  }, [language, dir]);

  function changeLanguage(nextLanguage) {
    if (nextLanguage !== 'en' && nextLanguage !== 'ar') {
      return;
    }

    setLanguage(nextLanguage);
  }

  function t(key) {
    const translatedText = translations[language][key];

    if (typeof translatedText === 'string') {
      return translatedText;
    }

    // Fall back to English, then show the missing key.
    const englishText = translations.en[key];

    return typeof englishText === 'string' ? englishText : key;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        dir,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Keep the provider and its small hook in the same context file.
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }

  return context;
}