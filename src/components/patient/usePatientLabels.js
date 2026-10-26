import { useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { localized } from '../../utils/centerFormat.js';

export function usePatientLabels() {
  const { t, language, dir } = useLanguage();
  const translate = useCallback((key, vars) => t(`patientDiscovery.${key}`, vars), [t]);
  return {
    t: translate,
    name: v => localized(v, language),
    language,
    dir,
    money: n => new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'ILS'
    }).format(n)
  };
}
