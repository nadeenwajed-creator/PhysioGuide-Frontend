import { useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { faHouse, faCalendarDays, faUsers, faUserDoctor, faBriefcaseMedical, faStar, faBuilding, faGear, faComments, faUser, faLocationDot, faClipboardList } from '@fortawesome/free-solid-svg-icons';
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
import { getMessagingWorkspace } from '../services/messageService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logout as signOut } from '../services/authService.js';
import { markNotificationsRead } from '../services/notificationService.js';
import { localized } from '../utils/centerFormat.js';
import { notificationPreference } from '../services/patient/notificationPolicy.js';
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

function CenterLayout({ portal = 'center' }) {
  const therapistPortal = portal === 'physiotherapist';
  const patientPortal = portal === 'patient';
  const messagesBase = patientPortal ? '/patient/messages' : '/center/physiotherapist/messages';
  const { pathname } = useLocation();
  // The local assessment must stay usable independently of messaging availability.
  // Authentication remains enforced by the existing Patient route guard.
  const localAssessment = patientPortal && pathname.replace(/\/$/, '') === '/patient/pain-assessment';
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
  const [flash, setFlash] = useState(null);
  const [logout, setLogout] = useState(false);
  const tr = (key, variables) => t(`center.${key}`, variables);
  const name = value => localized(value, language);
  useEffect(() => {
    let active = true;
    let request = 0;
    async function refresh() {
      const current = ++request;
      try {
        const result = await (patientPortal ? getMessagingWorkspace(actor) : getCenterWorkspace(actor));
        if (active && current === request) {
          setWorkspace({
            actorId: actor.id,
            role,
            centerId: actor.centerId,
            therapistId: actor.therapistId,
            patientId: actor.patientId,
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
  }, [actor, role, retry, patientPortal]);
  const data = workspace?.actorId === actor.id && workspace.role === role && workspace.centerId === actor.centerId && workspace.therapistId === actor.therapistId && workspace.patientId === actor.patientId ? workspace.data : null;
  const navigation = patientPortal ? [['dashboard', faHouse], ['centers', faLocationDot], ['pain-assessment', faClipboardList], ['appointments', faCalendarDays], ['messages', faComments], ['profile', faUser], ['settings', faGear]] : therapistPortal ? [['messages', faComments], ['profile', faUser]] : centerNavigation;
  const profilePath = patientPortal ? '/patient/profile' : therapistPortal ? '/center/physiotherapist/profile' : '/center/profile';
  const items = navigation.map(([id, icon]) => ({
    id,
    icon,
    label: patientPortal ? t(`patientDiscovery.${id}`) : tr(id === 'messages' || therapistPortal ? `therapistProfile.${id}` : id === 'profile' ? 'centerProfile' : id),
    to: patientPortal ? `/patient/${id}` : therapistPortal ? `/center/physiotherapist/${id}` : `/center/${id}`,
    end: !['messages','centers'].includes(id),
    badge: id === 'messages' ? (data?.conversations || []).reduce((sum, item) => sum + item.unreadCount, 0) : undefined,
  }));
  const current = items.find(item => pathname.startsWith(item.to));
  const title = current?.label || tr('dashboard');
  useEffect(() => {
    document.title = `${title} | PhysioGuide`;
  }, [title]);
  const account = patientPortal ? data?.patientProfile || data?.patients.find(item => item.id === actor.patientId) || actor : therapistPortal ? data?.therapists.find(item => item.id === actor.therapistId) : data?.center;
  const user = {
    name: name(account?.name),
    avatar: account?.imageUrl
  };
  const results = search.trim() ? items.filter(item => item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];
  const notifications = (data?.notifications || [])
    .filter(item => data.notificationPreferences?.[patientPortal ? notificationPreference(item) : notificationPreferences[item.type]] !== false)
    .map(item => ({
      ...item,
      title: (therapistPortal || patientPortal) && item.titleKey ? tr(`therapistNotifications.${item.titleKey}`) : name(item.title),
      message: (therapistPortal || patientPortal) && item.messageKey ? tr(`therapistNotifications.${item.messageKey}`) : name(item.message),
      to: (therapistPortal || patientPortal) ? item.target?.kind === 'professional' && therapistPortal
        ? '/center/physiotherapist/profile?tab=professional'
        : item.target?.kind === 'conversation' && data.conversations?.some(conversation => conversation.id === item.target.id)
          ? `${messagesBase}/${encodeURIComponent(item.target.id)}`
          : item.target?.kind === 'appointment' && patientPortal ? `/patient/appointments?appointment=${encodeURIComponent(item.target.id)}` : undefined : undefined,
    }));

  function notify(message, { error = false } = {}) {
    // A repeated save starts a fresh timer even when the translated text is identical.
    setFlash(previous => ({ message, error, id: (previous?.id || 0) + 1 }));
  }
  async function markRead(id) {
    try {
      await markNotificationsRead(actor, id);
    } catch (failure) {
      notify(tr(`error.${failure.code || 'network'}`), { error: true });
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
        profilePath={profilePath}
        labels={{ logout: tr('logout'), profile: patientPortal ? t('patientDiscovery.profile') : tr(therapistPortal ? 'therapistProfile.profile' : 'centerProfile') }}
        onRequestLogout={() => setLogout(true)}
      />}
    />
    <div className="center-layout__body">
      <Sidebar id="center-sidebar" items={items} account={{
        ...user,
        role: patientPortal ? t('messaging.patient') : tr(therapistPortal ? 'therapistProfile.role' : 'centerAccount')
      }} isOpen={open} onClose={() => setOpen(false)} />
      <div className="center-layout__column">
        <main id="center-content" className="center-page" tabIndex={-1}>
          {flash && <div className="center-layout__notice">
            <Feedback key={flash.id} error={flash.error} onDismiss={() => setFlash(null)}>{flash.message}</Feedback>
            {flash.error && <Button variant="ghost" onClick={() => setFlash(null)}>{tr('dismiss')}</Button>}
          </div>}
          {localAssessment ? <Outlet key={actor.id} /> : error ? <>
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
            notify
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
