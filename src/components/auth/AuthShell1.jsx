
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useOutlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import logo from '../../assets/logo/physioguide-icon.svg';
import './AuthShell.css';

const desktopQuery = '(min-width: 960px)';
const motionQuery = '(prefers-reduced-motion: reduce)';

function subscribeDisplay(callback) {
  const queries = [window.matchMedia(desktopQuery), window.matchMedia(motionQuery)];
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}

function AuthShell() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const desktop = useSyncExternalStore(subscribeDisplay, () => window.matchMedia(desktopQuery).matches);
  const reducedMotion = useSyncExternalStore(subscribeDisplay, () => window.matchMedia(motionQuery).matches);
  const [view, setView] = useState({ pathname, outlet });
  const shellRef = useRef(null);
  const formRef = useRef(null);
  const hasEnteredRef = useRef(false);
  const previousHeightRef = useRef(null);
  const heightAnimationRef = useRef(null);
  const { t, dir } = useLanguage();
  const mode = pathname.endsWith('/signup') ? 'signup' : 'login';
  const role = pathname.startsWith('/center/') ? 'center' : 'patient';
  const staged = desktop && !reducedMotion;
  if (!staged && view.pathname !== pathname) setView({ pathname, outlet });
  const displayed = staged ? view : { pathname, outlet };
  const formMode = displayed.pathname.endsWith('/signup') ? 'signup' : 'login';

  // Hide the old form before placing the new form on the other side.
  useLayoutEffect(() => {
    if (!staged || view.pathname === pathname) return undefined;
    const form = formRef.current;
    const direction = dir === 'rtl' ? -1 : 1;
    const exit = form.animate([
      { opacity: getComputedStyle(form).opacity, transform: 'translateX(0)' },
      { opacity: 0, transform: `translateX(${direction * (mode === 'signup' ? -16 : 16)}px)` },
    ], { duration: 160, fill: 'forwards', easing: 'ease-out' });
    exit.onfinish = () => setView({ pathname, outlet });
    return () => exit.cancel();
  }, [pathname, outlet, staged, dir, mode, view.pathname]);

  // Reveal the next form after the branding panel has moved past it.
  useLayoutEffect(() => {
    if (!staged) {
      hasEnteredRef.current = false;
      return undefined;
    }
    if (!hasEnteredRef.current) {
      hasEnteredRef.current = true;
      return undefined;
    }
    const shift = (dir === 'rtl' ? -1 : 1) * (formMode === 'signup' ? 16 : -16);
    const form = formRef.current;
    form.inert = true;
    const entry = form.animate([
      { opacity: 0, transform: `translateX(${shift}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 280, delay: 400, fill: 'backwards', easing: 'ease-out' });
    entry.onfinish = () => {
      form.inert = false;
      form.querySelector('h1')?.focus({ preventScroll: true });
    };
    return () => {
      entry.cancel();
      form.inert = false;
    };
  }, [displayed.pathname, staged, dir, formMode]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const previous = heightAnimationRef.current ? shell.getBoundingClientRect().height : previousHeightRef.current;
    heightAnimationRef.current?.cancel();
    heightAnimationRef.current = null;
    const next = shell.getBoundingClientRect().height;
    previousHeightRef.current = next;
    if (previous === null || Math.abs(previous - next) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Let longer forms grow naturally, with a smooth height change between routes.
    const compact = window.matchMedia('(max-width: 959px)').matches;
    const animation = shell.animate([{ blockSize: previous + 'px' }, { blockSize: next + 'px' }], {
      duration: compact ? 360 : 520,
      easing: 'cubic-bezier(.22, .7, .2, 1)',
    });
    heightAnimationRef.current = animation;
    animation.onfinish = () => {
      if (heightAnimationRef.current === animation) {
        heightAnimationRef.current = null;
        previousHeightRef.current = shell.getBoundingClientRect().height;
      }
    };
  }, [displayed.pathname]);

  useEffect(() => {
    const shell = shellRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new ResizeObserver(() => {
      if (!heightAnimationRef.current) previousHeightRef.current = shell.getBoundingClientRect().height;
    });
    function restoreNaturalSize() {
      heightAnimationRef.current?.cancel();
      heightAnimationRef.current = null;
      previousHeightRef.current = shell.getBoundingClientRect().height;
    }
    observer.observe(shell);
    window.addEventListener('resize', restoreNaturalSize);
    motion.addEventListener('change', restoreNaturalSize);
    return () => {
      observer.disconnect();
      heightAnimationRef.current?.cancel();
      window.removeEventListener('resize', restoreNaturalSize);
      motion.removeEventListener('change', restoreNaturalSize);
    };
  }, []);

  return (
    <section ref={shellRef} className={`auth-shell auth-shell--${mode}`} aria-label={t('auth.pageLabel')}>
      <Link className="auth-shell__back" to="/choose-role" aria-label={t('auth.chooseRole')}>
        <FontAwesomeIcon icon={faArrowLeft} className="public-directional" aria-hidden="true" />
        <span className="auth-shell__back-label">{t('auth.chooseRole')}</span>
      </Link>

      {/* The same branding panel moves between Login and Signup. */}
      <aside className="auth-shell__panel">
        <div className="auth-shell__story">
          <Link to="/" className="auth-shell__brand" aria-label={t('public.home')}>
            <img className="auth-shell__logo" src={logo} alt="" width="40" height="40" />
            <span>PhysioGuide</span>
          </Link>
          <p className="auth-shell__eyebrow">{t(`auth.${role}.eyebrow`)}</p>
          <h2>{t(`auth.${role}.headline`)} <span>{t(`auth.${role}.accent`)}</span></h2>
          <p className="auth-shell__description">{t(`auth.${role}.description`)}</p>
        </div>
      </aside>

      <div className={`auth-shell__form-area auth-shell__form-area--${formMode}`}>
        <div ref={formRef} key={displayed.pathname} className="auth-shell__form-entry" inert={staged && view.pathname !== pathname}>
          {displayed.outlet}
        </div>
      </div>
    </section>
  );
}

export default AuthShell;
