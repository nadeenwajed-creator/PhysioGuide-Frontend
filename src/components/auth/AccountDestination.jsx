import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ThemeContext from '../../context/ThemeContext.jsx';
import { logout } from '../../services/authService.js';
import Navbar from '../shared/Navbar/Navbar.jsx';
import Footer from '../shared/Footer/Footer.jsx';
import ThemeToggle from '../shared/ThemeToggle/ThemeToggle.jsx';
import LanguageSwitcher from '../shared/LanguageSwitcher/LanguageSwitcher.jsx';
import ProfileMenu from '../shared/ProfileMenu/ProfileMenu.jsx';
import QuickSettings from '../shared/QuickSettings/QuickSettings.jsx';
import Button from '../shared/Button/Button.jsx';
import logo from '../../assets/logo/physioguide-icon.svg';
import './AccountDestination.css';

// A signed-in account destination until the separately owned portal pages are integrated.
export default function AccountDestination() {
  const { session } = useAuth();
  const { t, language, dir } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const name = typeof session.name === 'string' ? session.name : session.name?.[language];
  const title = t(session.role === 'patient' ? 'account.patientTitle' : 'account.therapistTitle');
  useEffect(() => { document.title = `${title} | PhysioGuide`; }, [title]);
  async function signOut() {
    setBusy(true);
    try {
      navigate(await logout(), { replace: true });
    } catch { setError(t('auth.error.unavailable')); setBusy(false); }
  }
  return <div className="account-destination" dir={dir}>
    <Navbar logoSrc={logo} theme={theme} homePath="/" themeToggle={<ThemeToggle />} languageSwitcher={<LanguageSwitcher />}
      quickSettings={<QuickSettings languageSwitcher={<LanguageSwitcher variant="mobile" />} themeToggle={<ThemeToggle />} />}
      profileMenu={({ compact }) => <ProfileMenu compact={compact} user={{ name }} labels={{ logout: t('center.logout') }} onRequestLogout={signOut} />} />
    <main className="account-destination__main">
      <h1>{title}</h1>
      <p>{t('account.welcome', { name })}</p>
      <section className="account-destination__card">
        <h2>{t('account.title')}</h2>
        <p><bdi>{session.email}</bdi></p>
        <p>{t('account.signedIn')}</p>
        <Button loading={busy} onClick={signOut}>{t('center.logout')}</Button>
        {error && <p role="alert">{error}</p>}
      </section>
      <Link to="/">{t('account.home')}</Link>
    </main>
    <Footer description="" />
  </div>;
}
