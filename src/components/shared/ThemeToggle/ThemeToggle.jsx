
import { useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';
import ThemeContext from '../../../context/ThemeContext.jsx';

import './ThemeToggle.css';

function ThemeToggle({ labels = {}, disabled = false }) {
  const { t } = useLanguage();
  const themeContext = useContext(ThemeContext);

  // Report an integration error instead of creating another theme state.
  if (!themeContext) {
    throw new Error('ThemeToggle must be used inside ThemeProvider.');
  }

  const { theme, toggleTheme } = themeContext;

  // Use translated defaults while allowing custom labels.
  const text = {
    switchToDark: t('themeToggle.switchToDark'),
    switchToLight: t('themeToggle.switchToLight'),
    ...labels,
  };

  const isDark = theme === 'dark';

  const actionLabel = isDark
    ? text.switchToLight
    : text.switchToDark;

  return (
    <button
      type="button"
      className="pg-theme-toggle"
      onClick={toggleTheme}
      disabled={disabled}
      aria-label={actionLabel}
      title={actionLabel}
    >
      {/* The icon shows the current mode; the label describes the action. */}
      <FontAwesomeIcon
        icon={isDark ? faMoon : faSun}
        className="pg-theme-toggle__icon"
        aria-hidden="true"
      />
    </button>
  );
}

export default ThemeToggle;
