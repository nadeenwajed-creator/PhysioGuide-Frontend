
import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';

import './SearchBar.css';

function SearchBar({
  value,
  defaultValue = '',
  onChange,
  onSearch,
  placeholder,
  ariaLabel,
  clearLabel,
  disabled = false,
  dir,
  className = '',
}) {
  const { t, dir: languageDir } = useLanguage();

  const inputRef = useRef(null);
  const [internalValue, setInternalValue] = useState(defaultValue);

  const resolvedPlaceholder =
    placeholder ?? t('searchBar.placeholder');

  const resolvedAriaLabel =
    ariaLabel ?? t('searchBar.ariaLabel');

  const resolvedClearLabel =
    clearLabel ?? t('searchBar.clearLabel');

  const resolvedDir = dir ?? languageDir;

  const isControlled = value !== undefined;
  const searchValue = (isControlled ? value : internalValue) ?? '';

  const searchClasses = [
    'pg-search-bar',
    disabled && 'pg-search-bar--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  function updateValue(nextValue) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  }

  function handleChange(event) {
    updateValue(event.target.value);
  }

  function handleKeyDown(event) {
    if (
      event.key !== 'Enter' ||
      event.nativeEvent.isComposing ||
      disabled ||
      typeof onSearch !== 'function'
    ) {
      return;
    }

    // Override form submission only when a search callback is provided.
    event.preventDefault();
    onSearch(searchValue);
  }

  function handleClear() {
    updateValue('');
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={searchClasses} dir={resolvedDir}>
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="pg-search-bar__icon"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        type="search"
        className="pg-search-bar__input"
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={resolvedPlaceholder}
        aria-label={resolvedAriaLabel}
        disabled={disabled}
        enterKeyHint="search"
      />

      {!disabled && searchValue !== '' && (
        <button
          type="button"
          className="pg-search-bar__clear"
          onClick={handleClear}
          aria-label={resolvedClearLabel}
          disabled={disabled}
        >
          <FontAwesomeIcon
            icon={faXmark}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
