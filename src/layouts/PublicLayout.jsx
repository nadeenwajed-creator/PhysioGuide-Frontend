import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader.jsx';
import Footer from '../components/shared/Footer/Footer.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import './PublicLayout.css';

// Adds the public header and footer around each page.
function PublicLayout() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const showFooter = pathname === "/";
  const titleKey = pathname === '/' ? 'public.pageTitle'
    : pathname === '/choose-role' ? 'role.pageTitle'
      : pathname.endsWith('/signup') ? 'auth.createAccount' : 'auth.signIn';

  // Updates the title for the current page and language.
  useEffect(() => {
    document.title = `${t(titleKey)} | PhysioGuide`;
  }, [t, titleKey]);

  return (
    <div className="public-layout">
      <a className="public-layout__skip" href="#public-content">{t('public.skipContent')}</a>
      <PublicHeader key={pathname === '/' ? 'landing' : 'compact'} compact={pathname !== '/'} />
      <main id="public-content" className="public-layout__main" tabIndex={-1}><Outlet /></main>
      {pathname === '/center/signup' && (
        <div className="public-layout__location-attribution">
          <p>
            {t('auth.location.poweredBy')}{' '}<a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>
            {' · © '}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{t('auth.location.osmContributors')}</a>
          </p>
        </div>
      )}
      {showFooter && <Footer />}
    </div>
  );
}

export default PublicLayout;
