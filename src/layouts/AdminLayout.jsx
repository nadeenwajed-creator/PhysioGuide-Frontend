import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { faHouse, faBuilding, faUsers, faUserDoctor, faCalendarDays, faStar, faGear } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/shared/Navbar/Navbar.jsx';
import NotificationsDropdown from '../components/shared/NotificationsDropdown/NotificationsDropdown.jsx';
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
import { callAdmin } from '../services/adminService.js';
import { markNotificationsRead } from '../services/notificationService.js';
import { startMessagingRealtime } from '../services/messagingRealtime.js';
import { personFace } from '../utils/personImage.js';
import { localized } from '../utils/centerFormat.js';
import { ConfirmDialog } from '../components/center/CenterUI.jsx';
import logo from '../assets/logo/physioguide-icon.svg';
import './CenterLayout.css';

// Types the admin settings page can toggle; any other type falls back to
// the system-alerts switch. Each type also says where a click should land.
const adminBellTypes = {
  centerApproval: { preference: 'approvalRequests', to: '/admin/centers' },
  appointmentCancelled: { preference: 'appointmentUpdates', to: '/admin/appointments' },
  reviewReported: { preference: 'reportedReviews', to: '/admin/reviews' },
  therapistVerified: { preference: 'approvalRequests', to: '/admin/physiotherapists' },
};

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
  const { t, language, dir } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [logout, setLogout] = useState(false);
  // Photo stored on the admin account; the generated face is only a fallback.
  const [profileImage, setProfileImage] = useState('');

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
    // The uploaded photo wins; without one the deterministic face from
    // initials + email domain keeps the header and sidebar unique.
    avatar: profileImage || personFace(session?.name || 'Admin', session?.email),
  };

  const results = search.trim()
    ? items.filter(item => item.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    : [];

  // The navbar bell is the official notifications surface for the admin —
  // there is no dedicated notifications page, like every other role.
  const [bell, setBell] = useState({ notifications: [], notificationPreferences: {} });
  const refreshBell = useCallback(
    () =>
      callAdmin('getAdminNotifications')
        .then((result) => {
          setBell({
            notifications: result?.notifications || [],
            notificationPreferences: result?.notificationPreferences || {},
          });
        })
        .catch(() => {
          // A transient failure keeps the last list; focus and push will retry.
        }),
    []
  );

  useEffect(() => {
    let live = true;
    const load = () => {
      callAdmin('getAdminNotifications')
        .then((result) => {
          if (live) {
            setBell({
              notifications: result?.notifications || [],
              notificationPreferences: result?.notificationPreferences || {},
            });
          }
        })
        .catch(() => {
          // A transient failure keeps the last list; focus and push will retry.
        });

      // Same request as the settings page: the header avatar follows the
      // account photo instead of always showing the generated face.
      callAdmin('getAdminSettings')
        .then((result) => {
          if (live) setProfileImage(result?.profile?.imageUrl || '');
        })
        .catch(() => {
          // Keep the last known photo when settings cannot be read.
        });
    };
    load();
    window.addEventListener('focus', load);
    return () => {
      live = false;
      window.removeEventListener('focus', load);
    };
  }, [pathname]);

  // Server push: an event for this admin refreshes the bell immediately.
  useEffect(() => startMessagingRealtime(refreshBell), [refreshBell]);

  const adminNotifications = bell.notifications
    .filter(item =>
      bell.notificationPreferences[adminBellTypes[item.type]?.preference ?? 'systemAlerts'] !== false
    )
    .map(item => {
      const known = adminBellTypes[item.type];
      return {
        ...item,
        title: known ? t(`admin.notification.${item.type}`) : localized(item.title, language),
        message: known ? t(`admin.notification.${item.type}Body`) : localized(item.message, language),
        to: known?.to,
      };
    });

  async function markRead(id) {
    try {
      await markNotificationsRead(session, id);
      await refreshBell();
    } catch {
      // The bell retries on the next focus or push event.
    }
  }

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
        notifications={<NotificationsDropdown notifications={adminNotifications} onMarkAsRead={markRead} onMarkAllAsRead={() => markRead()} />}
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
            {/* The settings page reports a fresh photo so the header updates
                without waiting for the next navigation. */}
            <Outlet context={{ setProfileImage }} />
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
