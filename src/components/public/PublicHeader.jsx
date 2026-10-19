import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import ThemeToggle from '../shared/ThemeToggle/ThemeToggle.jsx';
import LanguageSwitcher from '../shared/LanguageSwitcher/LanguageSwitcher.jsx';
import QuickSettings from '../shared/QuickSettings/QuickSettings.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import logo from '../../assets/logo/physioguide-icon.svg';
import './PublicHeader.css';

const sections = [
  { id: 'home', key: 'public.home' },
  { id: 'about', key: 'public.about' },
  { id: 'how-it-works', key: 'public.howItWorks' },
  { id: 'services', key: 'public.services' },
];

// Shows the public navigation and shared language and theme controls.
function PublicHeader({ compact = false }) {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const headerRef = useRef(null);
  const selectedSectionRef = useRef(null);
  const selectionTimerRef = useRef(null);

  useEffect(() => {
    if (compact) return undefined;

    const header = headerRef.current;
    const layout = header.closest('.public-layout');
    let frame = 0;

    function updateActiveSection() {
      frame = 0;
      const selected = selectedSectionRef.current;
      // Keeps the clicked link active until the user scrolls elsewhere.
      if (selected && (selected.moving || Math.abs(window.scrollY - selected.top) < 3)) {
        setActiveSection(selected.id);
        return;
      }
      selectedSectionRef.current = null;

      // Finds the section currently below the header.
      const positions = sections.map(({ id }) => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top }))
        .filter(({ top }) => top !== undefined).sort((a, b) => a.top - b.top);
      const readingLine = header.getBoundingClientRect().bottom + 24;
      const passed = positions.filter(({ top }) => top <= readingLine);
      const atBottom = window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;
      setActiveSection((atBottom ? positions.at(-1) : passed.at(-1))?.id ?? 'home');
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    }

    function releaseSelection(event) {
      if (event.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
      selectedSectionRef.current = null;
      scheduleUpdate();
    }

    function measureHeader() {
      // Leaves space for the sticky header when scrolling to a section.
      layout.style.setProperty('--public-header-height', `${header.getBoundingClientRect().height}px`);
      selectedSectionRef.current = null;
      scheduleUpdate();
    }

    const observer = new ResizeObserver(measureHeader);
    observer.observe(header);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', measureHeader);
    window.addEventListener('wheel', releaseSelection, { passive: true });
    window.addEventListener('touchstart', releaseSelection, { passive: true });
    window.addEventListener('keydown', releaseSelection);
    window.addEventListener('popstate', releaseSelection);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(selectionTimerRef.current);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', measureHeader);
      window.removeEventListener('wheel', releaseSelection);
      window.removeEventListener('touchstart', releaseSelection);
      window.removeEventListener('keydown', releaseSelection);
      window.removeEventListener('popstate', releaseSelection);
      layout.style.removeProperty('--public-header-height');
    };
  }, [compact]);

  function handleSectionClick(event, id) {
    // Allows shortcuts such as opening a link in a new tab.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    setMenuOpen(false);
    setActiveSection(id);
    const offset = headerRef.current.getBoundingClientRect().height + 16;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const top = Math.max(0, Math.min(maxScroll, window.scrollY + target.getBoundingClientRect().top - offset));
    selectedSectionRef.current = { id, top, moving: true };
    window.clearTimeout(selectionTimerRef.current);
    selectionTimerRef.current = window.setTimeout(() => {
      if (selectedSectionRef.current) selectedSectionRef.current.moving = false;
    }, 2000);
    // Adds the section to browser history.
    if (window.location.hash !== `#${id}`) navigate(`#${id}`, { preventScrollReset: true });
    
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  return (
    <header ref={headerRef} className={`public-header${compact ? ' public-header--compact' : ''}`}>
      <div className="public-header__inner">
        {compact ? (
          <Link to="/" className="public-header__home">
            <FontAwesomeIcon icon={faArrowLeft} className="public-directional" aria-hidden="true" />
            {t('public.backHome')}
          </Link>
        ) : (
          <Link to="/" className="public-header__brand" aria-label={t('public.home')}>
            <img src={logo} alt="" width="44" height="44" />
            <span>PhysioGuide</span>
          </Link>
        )}
        {!compact && (
          <nav className="public-header__nav" aria-label={t('public.navigation')}>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined} onClick={(event) => handleSectionClick(event, section.id)}>{t(section.key)}</a>
            ))}
          </nav>
        )}
        <div className="public-header__actions">
          <div className="public-header__desktop-settings"><ThemeToggle /><LanguageSwitcher /></div>
          <div className="public-header__mobile-settings">
            <QuickSettings languageSwitcher={<LanguageSwitcher variant="mobile" />} themeToggle={<ThemeToggle />} />
          </div>
          {!compact && (
            <>
              <Link className="public-header__login public-link-button" to="/choose-role">
                <FontAwesomeIcon icon={faUser} aria-hidden="true" />{t('auth.signIn')}
              </Link>
              <Dropdown className="public-header__mobile-menu" show={menuOpen} onToggle={setMenuOpen} align={dir === 'rtl' ? 'start' : 'end'} focusFirstItemOnShow="keyboard">
                <Dropdown.Toggle as="button" type="button" className="public-header__menu-toggle" id="public-menu-toggle" aria-label={t('public.navigation')} aria-controls="public-menu">
                  <FontAwesomeIcon icon={faBars} aria-hidden="true" />
                </Dropdown.Toggle>
                <Dropdown.Menu id="public-menu" className="public-header__menu" aria-labelledby="public-menu-toggle" popperConfig={{ strategy: 'fixed' }}>
                  {sections.map((section) => (
                    <Dropdown.Item key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined} onClick={(event) => handleSectionClick(event, section.id)}>{t(section.key)}</Dropdown.Item>
                  ))}
                  <Dropdown.Item as={Link} to="/choose-role" onClick={() => setMenuOpen(false)}>{t('auth.signIn')}</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
