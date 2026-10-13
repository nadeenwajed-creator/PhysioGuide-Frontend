
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
    // This provider controls the page language and direction.
    document.documentElement.lang = language;
    document.documentElement.dir = dir;

    try {
      window.localStorage.setItem(storageKey, language);
    } catch {
      // Language switching works even when storage is unavailable.
    }
  }, [language, dir]);

  function changeLanguage(nextLanguage) {
    if (nextLanguage !== 'en' && nextLanguage !== 'ar') {
      return;
    }

    setLanguage(nextLanguage);
  }

  function t(key, variables = {}) {
    const translatedText = translations[language][key];
    const englishText = translations.en[key];

    let text;

    if (typeof translatedText === 'string') {
      text = translatedText;
    } else if (typeof englishText === 'string') {
      text = englishText;
    } else {
      return key;
    }

    return text.replace(/\{(\w+)\}/g, (match, name) => {
      if (
        Object.prototype.hasOwnProperty.call(variables, name) &&
        variables[name] !== null &&
        variables[name] !== undefined
      ) {
        return String(variables[name]);
      }

      return match;
    });
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

// Keep the provider and hook in the same context file.
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }

  return context;
}
