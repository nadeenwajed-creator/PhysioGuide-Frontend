import { useId, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faChevronDown,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';

import './LanguageSwitcher.css';

const languages = [
  {
    value: 'en',
    shortLabel: 'EN',
    labelKey: 'languageSwitcher.english',
    dir: 'ltr',
  },
  {
    value: 'ar',
    shortLabel: 'ع',
    labelKey: 'languageSwitcher.arabic',
    dir: 'rtl',
  },
];

function LanguageSwitcher({ variant = 'desktop' }) {
  const { language, changeLanguage, dir, t } = useLanguage();

  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const id = useId();

  const currentLanguage = languages.find(
    (option) => option.value === language
  );

  function handleSelect(nextLanguage) {
    changeLanguage(nextLanguage);
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();

      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  // Native buttons keep the surrounding QuickSettings dropdown open.
  if (variant === 'mobile') {
    return (
      <div
        className="pg-language-switcher pg-language-switcher--mobile"
        role="group"
        aria-label={t('languageSwitcher.label')}
        dir="ltr"
      >
        {languages.map((option) => (
          <button
            key={option.value}
            type="button"
            className="pg-language-switcher__segment"
            onClick={() => changeLanguage(option.value)}
            aria-label={t(option.labelKey)}
            aria-pressed={language === option.value}
            lang={option.value}
            dir={option.dir}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Dropdown
      className="pg-language-switcher pg-language-switcher--desktop"
      show={open}
      onToggle={setOpen}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
      align={dir === 'rtl' ? 'start' : 'end'}
      dir={dir}
      autoClose
      focusFirstItemOnShow
    >
      <Dropdown.Toggle
        as="button"
        ref={toggleRef}
        id={`${id}-toggle`}
        type="button"
        className="pg-language-switcher__toggle"
        aria-label={`${t('languageSwitcher.label')}: ${t(currentLanguage.labelKey)}`}
        aria-haspopup="menu"
        aria-controls={`${id}-menu`}
      >
        <FontAwesomeIcon
          icon={faGlobe}
          className="pg-language-switcher__globe"
          aria-hidden="true"
        />

        <span
          className="pg-language-switcher__current"
          lang={language}
          dir={dir}
        >
          {currentLanguage.shortLabel}
        </span>

        <FontAwesomeIcon
          icon={faChevronDown}
          className="pg-language-switcher__chevron"
          aria-hidden="true"
        />
      </Dropdown.Toggle>

      <Dropdown.Menu
        id={`${id}-menu`}
        className="pg-language-switcher__menu"
        role="menu"
        aria-labelledby={`${id}-toggle`}
        renderOnMount
        popperConfig={{
          strategy: 'fixed',
          modifiers: [
            {
              name: 'offset',
              options: { offset: [0, 8] },
            },
            {
              name: 'preventOverflow',
              options: {
                padding: 12,
                altAxis: true,
                tether: false,
              },
            },
            {
              name: 'flip',
              options: { padding: 12 },
            },
          ],
        }}
      >
        {languages.map((option) => (
          <Dropdown.Item
            key={option.value}
            as="button"
            type="button"
            eventKey={option.value}
            className="pg-language-switcher__option"
            role="menuitemradio"
            aria-checked={language === option.value}
          >
            <span
              className="pg-language-switcher__option-label"
              lang={option.value}
              dir={option.dir}
            >
              {t(option.labelKey)}
            </span>

            <span
              className="pg-language-switcher__check"
              aria-hidden="true"
            >
              {language === option.value && (
                <FontAwesomeIcon icon={faCheck} />
              )}
            </span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default LanguageSwitcher;