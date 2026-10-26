import { useEffect } from 'react';

let guardPop = null;
const handlePop = event => guardPop?.(event);
// Register before BrowserRouter: it can otherwise unmount the form before its guard runs.
if (typeof window !== 'undefined') window.addEventListener('popstate', handlePop, true);
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('popstate', handlePop, true));

export default function useUnsavedChanges(dirty, message) {
  useEffect(() => {
    if (!dirty) return;
    const prevent = event => { event.preventDefault(); event.stopImmediatePropagation(); };
    const click = event => {
      const link = event.target.closest('a[href]');
      const section = event.target.closest('.center-settings__navigation button');
      if (link?.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const logout = event.target.closest('.pg-profile-menu__item--danger');
      const leaving = link && link.href !== window.location.href && !link.getAttribute('href').startsWith('#') || section && section.getAttribute('aria-current') !== 'page' || logout;
      if (leaving && !window.confirm(message)) prevent(event);
    };
    const search = event => {
      if (event.key === 'Enter' && event.target.closest('.center-layout__search') && !window.confirm(message)) prevent(event);
    };
    const unload = event => { event.preventDefault(); event.returnValue = ''; };
    let index = window.history.state?.idx;
    let restoring = false;
    const pop = event => {
      const next = event.state?.idx;
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (!window.confirm(message) && Number.isInteger(index) && Number.isInteger(next)) {
        event.stopImmediatePropagation(); restoring = true; window.history.go(index - next);
      } else index = next;
    };
    window.addEventListener('beforeunload', unload);
    guardPop = pop;
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', search, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      if (guardPop === pop) guardPop = null;
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', search, true);
    };
  }, [dirty, message]);
}
