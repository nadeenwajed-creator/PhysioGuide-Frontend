import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';

import './Navbar.css';

function Navbar({
  logoSrc,
  homePath = '/',
  theme = 'light',
  search,
  themeToggle,
  languageSwitcher,
  notifications,
  profileMenu,
  onMenuToggle,
  menuOpen,
  menuId,
  menuLabel = 'Toggle navigation',
  homeLabel = 'PhysioGuide home',
  openSearchLabel = 'Open search',
  closeSearchLabel = 'Close search',
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    mobile: window.matchMedia('(max-width: 767px)').matches,
    compact: window.matchMedia('(max-width: 991px)').matches,
  }));

  const searchId = useId();
  const searchRef = useRef(null);
  const searchButtonRef = useRef(null);
  const focusAfterResize = useRef(false);
  const hasSidebar = Boolean(menuId) && typeof menuOpen === 'boolean';

  // These queries match the CSS breakpoints.
  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const compactQuery = window.matchMedia('(max-width: 991px)');

    function updateViewport() {
      const activeElement = document.activeElement;

      if (
        searchRef.current?.contains(activeElement) ||
        activeElement === searchButtonRef.current
      ) {
        focusAfterResize.current = true;
      }

      setViewport({
        mobile: mobileQuery.matches,
        compact: compactQuery.matches,
      });

      if (!mobileQuery.matches) {
        setSearchOpen(false);
      }
    }

    mobileQuery.addEventListener('change', updateViewport);
    compactQuery.addEventListener('change', updateViewport);

    return () => {
      mobileQuery.removeEventListener('change', updateViewport);
      compactQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  // Wait for the new layout before moving focus.
  useEffect(() => {
    if (!focusAfterResize.current && !(viewport.mobile && searchOpen)) {
      return;
    }

    const target = viewport.mobile && !searchOpen
      ? searchButtonRef.current
      : searchRef.current?.querySelector('input:not(:disabled)');

    target?.focus({ preventScroll: true });
    focusAfterResize.current = false;
  }, [viewport, searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    searchButtonRef.current?.focus({ preventScroll: true });
  }

  function toggleSearch() {
    if (searchOpen) {
      closeSearch();
    } else {
      setSearchOpen(true);
    }
  }

  function handleKeyDown(event) {
    if (
      !event.defaultPrevented &&
      event.key === 'Escape' &&
      viewport.mobile &&
      searchOpen
    ) {
      event.preventDefault();
      event.stopPropagation();
      closeSearch();
    }
  }

  // ProfileMenu receives these controls instead of duplicating them.
  const mobileActions = viewport.mobile ? (
    <div className="pg-navbar__mobile-preferences">
      {themeToggle}
      {languageSwitcher}
    </div>
  ) : null;

  const profileContent = typeof profileMenu === 'function'
    ? profileMenu({ compact: viewport.compact, mobileActions })
    : profileMenu;

  return (
    <header className="pg-navbar" data-theme={theme} onKeyDown={handleKeyDown}>
      <div className="pg-navbar__brand">
        <button
          type="button"
          className="pg-navbar__icon-button"
          onClick={onMenuToggle}
          disabled={!onMenuToggle}
          aria-label={menuLabel}
          aria-expanded={hasSidebar ? menuOpen : undefined}
          aria-controls={hasSidebar ? menuId : undefined}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        <Link className="pg-navbar__logo" to={homePath} aria-label={homeLabel}>
          {logoSrc && <img className="pg-navbar__logo-icon" src={logoSrc} alt="" />}
          <span className="pg-navbar__logo-text">PhysioGuide</span>
        </Link>
      </div>

      {viewport.mobile && (
        <button
          ref={searchButtonRef}
          type="button"
          className="pg-navbar__icon-button pg-navbar__search-toggle"
          onClick={toggleSearch}
          aria-label={searchOpen ? closeSearchLabel : openSearchLabel}
          aria-expanded={searchOpen}
          aria-controls={searchId}
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>
      )}

      <div
        ref={searchRef}
        id={searchId}
        className="pg-navbar__search"
        hidden={viewport.mobile && !searchOpen}
      >
        <div className="pg-navbar__search-content">{search}</div>

        {viewport.mobile && (
          <button
            type="button"
            className="pg-navbar__icon-button"
            onClick={closeSearch}
            aria-label={closeSearchLabel}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      <div className="pg-navbar__actions">
        {!viewport.mobile && (
          <>
            {themeToggle}
            {languageSwitcher}
          </>
        )}

        {notifications}
        <div className="pg-navbar__profile">{profileContent}</div>
      </div>
    </header>
  );
}

export default Navbar;