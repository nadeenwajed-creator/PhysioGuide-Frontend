import { useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { faHouse, faBuilding, faUsers, faUserDoctor, faCalendarDays, faStar, faGear } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/shared/Navbar/Navbar.jsx';
import Sidebar from '../components/shared/Sidebar/Sidebar.jsx';
import Footer from '../components/shared/Footer/Footer.jsx';
import ThemeToggle from '../components/shared/ThemeToggle/ThemeToggle.jsx';
import LanguageSwitcher from '../components/shared/LanguageSwitcher/LanguageSwitcher.jsx';
import QuickSettings from '../components/shared/QuickSettings/QuickSettings.jsx';
import ProfileMenu from '../components/shared/ProfileMenu/ProfileMenu.jsx';
import SearchBar from '../components/shared/SearchBar/SearchBar.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import ThemeContext from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { logout as signOut } from '../services/authService.js';
import { PERSON_PLACEHOLDER_IMAGE } from '../utils/personImage.js';
import { ConfirmDialog } from '../components/center/CenterUI.jsx';
import logo from '../assets/logo/physioguide-icon.svg';
import './CenterLayout.css';

const adminNavigation = [
  ['dashboard', faHouse],
  ['centers', faBuilding],
  ['patients', faUsers],
  ['physiotherapists', faUserDoctor],
  ['appointments', faCalendarDays],
  ['reviews', faStar],
  ['settings', faGear],
];

function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [logout, setLogout] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  const items = adminNavigation.map(([id, icon]) => ({
    id,
    icon,
    label: t(`admin.nav.${id}`),
    to: `/admin/${id}`,
    end: id === 'dashboard',
  }));

  const current = items.find(item => pathname.startsWith(item.to));
  const title = current?.label || t('admin.dashboard');

  useEffect(() => {
    document.title = `${title} | PhysioGuide Admin`;
  }, [title]);

  const user = {
    name: session?.name || 'Admin',
    avatar: PERSON_PLACEHOLDER_IMAGE,
  };

  const results = search.trim()
    ? items.filter(item => item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    : [];

  return (
    <div className="center-layout" dir={dir}>
      <a href="#admin-content" className="center-layout__skip">
        {t('center.skipContent')}
      </a>
      <Navbar
        logoSrc={logo}
        homePath="/admin/dashboard"
        theme={theme}
        menuOpen={open}
        menuId="admin-sidebar"
        onMenuToggle={() => setOpen(value => !value)}
        search={
          <div className="center-layout__search">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('center.searchPages')}
              ariaLabel={t('center.searchPages')}
              onSearch={() => {
                if (results[0]) {
                  navigate(results[0].to);
                  setSearch('');
                }
              }}
            />
            {search.trim() && (
              <div className="center-layout__search-results">
                {results.length ? (
                  results.map(item => (
                    <Link key={item.id} to={item.to} onClick={() => setSearch('')}>
                      {item.label}
                    </Link>
                  ))
                ) : (
                  <p>{t('center.noResults')}</p>
                )}
              </div>
            )}
          </div>
        }
        themeToggle={<ThemeToggle />}
        languageSwitcher={<LanguageSwitcher />}
        quickSettings={<QuickSettings languageSwitcher={<LanguageSwitcher variant="mobile" />} themeToggle={<ThemeToggle />} />}
        profileMenu={({ compact }) => (
          <ProfileMenu
            user={user}
            compact={compact}
            profilePath="/admin/settings"
            labels={{ logout: t('center.logout'), profile: t('admin.nav.settings') }}
            onRequestLogout={() => setLogout(true)}
          />
        )}
      />
      <div className="center-layout__body">
        <Sidebar
          id="admin-sidebar"
          items={items}
          account={{
            ...user,
            role: t('admin.settingsPage.superAdmin')
          }}
          isOpen={open}
          onClose={() => setOpen(false)}
        />
        <div className="center-layout__column">
          <main id="admin-content" className="center-page" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
      <Footer description="" />
      {logout && (
        <ConfirmDialog
          title={t('center.logout')}
          description={t('center.logoutHelp')}
          onClose={() => setLogout(false)}
          onConfirm={async () => {
            navigate(await signOut(), { replace: true });
          }}
        />
      )}
    </div>
  );
}

export default AdminLayout;
