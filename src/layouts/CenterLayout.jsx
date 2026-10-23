import { useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { faHouse, faCalendarDays, faUsers, faUserDoctor, faBriefcaseMedical, faStar, faBuilding, faGear } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/shared/Navbar/Navbar.jsx';
import Sidebar from '../components/shared/Sidebar/Sidebar.jsx';
import Footer from '../components/shared/Footer/Footer.jsx';
import ThemeToggle from '../components/shared/ThemeToggle/ThemeToggle.jsx';
import LanguageSwitcher from '../components/shared/LanguageSwitcher/LanguageSwitcher.jsx';
import QuickSettings from '../components/shared/QuickSettings/QuickSettings.jsx';
import NotificationsDropdown from '../components/shared/NotificationsDropdown/NotificationsDropdown.jsx';
import ProfileMenu from '../components/shared/ProfileMenu/ProfileMenu.jsx';
import SearchBar from '../components/shared/SearchBar/SearchBar.jsx';
import Button from '../components/shared/Button/Button.jsx';
import { ConfirmDialog, Feedback } from '../components/center/CenterUI.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import ThemeContext from '../context/ThemeContext.jsx';
import { getCenterWorkspace, subscribeCenter } from '../services/centerPortalService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logout as signOut } from '../services/authService.js';
import { markCenterNotificationsRead } from '../services/notificationService.js';
import { localized } from '../utils/centerFormat.js';
import logo from '../assets/logo/physioguide-icon.svg';
import './CenterLayout.css';
const centerNavigation = [
  ['dashboard', faHouse],
  ['appointments', faCalendarDays],
  ['patients', faUsers],
  ['physiotherapists', faUserDoctor],
  ['services', faBriefcaseMedical],
  ['reviews', faStar],
  ['profile', faBuilding],
  ['settings', faGear],
];
const notificationPreferences = { appointment: 'appointments', appointmentRequest: 'appointments', appointmentChange: 'appointmentChanges', review: 'reviews', patient: 'patients' };

function CenterLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  const { t, language, dir } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const { session: actor } = useAuth();
  const role = actor.role;
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState('');
  const [logout, setLogout] = useState(false);
  const tr = (key, variables) => t(`center.${key}`, variables);
  const name = value => localized(value, language);
  useEffect(() => {
    let active = true;
    let request = 0;
    async function refresh() {
      const current = ++request;
      try {
        const result = await getCenterWorkspace(actor);
        if (active && current === request) {
          setWorkspace({
            role,
            centerId: actor.centerId,
            data: result
          });
          setError('');
        }
      } catch (failure) {
        if (active && current === request) setError(failure.code || 'network');
      }
    }
    const unsubscribe = subscribeCenter(refresh);
    window.addEventListener('focus', refresh);
    refresh();
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  }, [actor, role, retry]);
  const data = workspace?.role === role && workspace.centerId === actor.centerId ? workspace.data : null;
  const items = centerNavigation.map(([id, icon]) => ({
    id,
    icon,
    label: tr(id === 'profile' ? 'centerProfile' : id),
    to: `/center/${id}`,
    end: true,
  }));
  const current = items.find(item => pathname.startsWith(item.to));
  const title = current?.label || tr('dashboard');
  useEffect(() => {
    document.title = `${title} | PhysioGuide`;
  }, [title]);
  const account = data?.center;
  const user = {
    name: name(account?.name),
    avatar: account?.imageUrl
  };
  const results = search.trim() ? items.filter(item => item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];
  const notifications = (data?.notifications || [])
    .filter(item => data.notificationPreferences?.[notificationPreferences[item.type]] !== false)
    .map(item => ({ ...item, title: name(item.title), message: name(item.message) }));

  async function markRead(id) {
    try {
      await markCenterNotificationsRead(actor, id);
    } catch (failure) {
      setFlash(tr(`error.${failure.code || 'network'}`));
    }
  }
  return <div className="center-layout" dir={dir}>
    <a href="#center-content" className="center-layout__skip">{tr('skipContent')}</a>
    <Navbar
      logoSrc={logo}
      homePath="/"
      theme={theme}
      menuOpen={open}
      menuId="center-sidebar"
      onMenuToggle={() => setOpen(value => !value)}
      search={<div className="center-layout__search">
        <SearchBar value={search} onChange={setSearch} placeholder={tr('searchPages')} ariaLabel={tr('searchPages')} onSearch={() => {
        if (results[0]) {
          navigate(results[0].to);
          setSearch('');
        }
      }} />
        {search.trim() && <div className="center-layout__search-results">{results.length ? results.map(item => <Link key={item.id} to={item.to} onClick={() => setSearch('')}>{item.label}</Link>) : <p>{tr('noResults')}</p>}</div>}
      </div>}
      themeToggle={<ThemeToggle />}
      languageSwitcher={<LanguageSwitcher />}
      quickSettings={<QuickSettings languageSwitcher={<LanguageSwitcher variant="mobile" />} themeToggle={<ThemeToggle />} />}
      notifications={<NotificationsDropdown notifications={notifications} onMarkAsRead={markRead} onMarkAllAsRead={() => markRead()} />}
      profileMenu={({ compact }) => <ProfileMenu
        user={user}
        compact={compact}
        profilePath="/center/profile"
        labels={{ logout: tr('logout'), profile: tr('centerProfile') }}
        onRequestLogout={() => setLogout(true)}
      />}
    />
    <div className="center-layout__body">
      <Sidebar id="center-sidebar" items={items} account={{
        ...user,
        role: tr('centerAccount')
      }} isOpen={open} onClose={() => setOpen(false)} />
      <div className="center-layout__column">
        <main id="center-content" className="center-page" tabIndex={-1}>
          {flash && <div className="center-layout__notice">
            <Feedback>{flash}</Feedback>
            <Button variant="ghost" onClick={() => setFlash('')}>{tr('dismiss')}</Button>
          </div>}
          {error ? <>
            <Feedback error>{tr(`error.${error}`)}</Feedback>
            <Button onClick={() => setRetry(value => value + 1)}>{tr('retry')}</Button>
          </> : data ? <Outlet context={{
            data,
            actor,
            role,
            language,
            dir,
            tr,
            name,
            notify: setFlash
          }} /> : <p role="status">{tr('loading')}</p>}
        </main>
      </div>
    </div>
    <Footer description="" />
    {logout && <ConfirmDialog title={tr('logout')} description={tr('logoutHelp')} onClose={() => setLogout(false)} onConfirm={async () => {
      navigate(await signOut(), { replace: true });
    }} />}
  </div>;
}
export default CenterLayout;
