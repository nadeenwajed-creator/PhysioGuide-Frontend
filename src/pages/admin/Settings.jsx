import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faFloppyDisk,
  faLock,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import { Feedback } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { loadSession } from '../../services/auth/session.js';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { errorText } from './useAdminQuery.js';
import { QueryState } from './AdminUI.jsx';
import './Settings.css';

function PasswordModal({ onClose }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError(t('auth.validation.passwordMismatch'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await callAdmin('changeAdminPassword', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onClose();
    } catch (failure) {
      // Map the credential failures to copy that fits this form, and fall back
      // to the shared admin text for anything else.
      if (failure?.code === 'invalidCredentials') setError(t('admin.changePassword.wrongCurrent'));
      else if (failure?.code === 'password' || failure?.code === 'validation') setError(t('admin.changePassword.tooShort'));
      else setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      size="sm"
      title={t('admin.changePassword.title')}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {t('center.cancel')}
          </Button>
          <Button type="submit" form="change-password-form" loading={saving}>
            {t('admin.changePassword.submit')}
          </Button>
        </>
      }
    >
      <form id="change-password-form" className="admin-form" onSubmit={submit} noValidate>
        <FormField
          label={t('admin.changePassword.current')}
          type="password"
          required
          showPasswordToggle
          value={form.currentPassword}
          onChange={(value) => set('currentPassword', value)}
          disabled={saving}
          autoComplete="current-password"
        />
        <FormField
          label={t('admin.changePassword.new')}
          type="password"
          required
          showPasswordToggle
          value={form.newPassword}
          onChange={(value) => set('newPassword', value)}
          disabled={saving}
          autoComplete="new-password"
        />
        <FormField
          label={t('admin.changePassword.confirm')}
          type="password"
          required
          showPasswordToggle
          value={form.confirm}
          onChange={(value) => set('confirm', value)}
          disabled={saving}
          autoComplete="new-password"
        />
        <Feedback error>{error}</Feedback>
      </form>
    </Modal>
  );
}

// Only the name and the phone are editable: the API accepts those two on the
// settings record (the email change belongs to another endpoint).
function ProfileModal({ profile, onClose, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('saveAdminSettings', { profile: form });
      onSaved();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      size="sm"
      title={t('admin.settingsPage.editProfileTitle')}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {t('center.cancel')}
          </Button>
          <Button type="submit" form="edit-profile-form" loading={saving}>
            {t('admin.settingsPage.saveChanges')}
          </Button>
        </>
      }
    >
      <form id="edit-profile-form" className="admin-form" onSubmit={submit} noValidate>
        <FormField
          label={t('admin.settingsPage.fullName')}
          required
          value={form.name}
          onChange={(value) => set('name', value)}
          disabled={saving}
          autoComplete="name"
        />
        <FormField
          label={t('admin.settingsPage.phone')}
          value={form.phone}
          onChange={(value) => set('phone', value)}
          disabled={saving}
          autoComplete="tel"
        />
        <Feedback error>{error}</Feedback>
      </form>
    </Modal>
  );
}

function AdminSettings() {
  const { t, language } = useLanguage();
  const state = useAdminQuery('getAdminSettings');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [notice, setNotice] = useState(null);
  // Reading the clock during render is a side effect; snapshot it once.
  const [now] = useState(() => Date.now());

  const data = state.data;
  const profile = data?.profile ?? {};
  // Local edits overlay the fetched values until the save round-trip completes.
  const notifs = notifications ?? data?.notifications ?? {};

  const toggleNotification = (key) => {
    setNotice(null);
    setNotifications((previous) => {
      const base = previous ?? data?.notifications ?? {};
      return { ...base, [key]: !base[key] };
    });
  };

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      await callAdmin('saveAdminSettings', { notifications: notifs });
      setNotifications(null);
      setNotice({ error: false, text: t('admin.settingsPage.saved') });
      state.reload();
    } catch (failure) {
      setNotice({ error: true, text: errorText(t, failure) });
    } finally {
      setSaving(false);
    }
  }

  const notificationItems = [
    'approvalRequests',
    'appointmentUpdates',
    'reportedReviews',
    'systemAlerts',
  ];

  // The single admin role reads as "Super Admin" in the interface.
  const roleLabel =
    !profile.role || profile.role.toLowerCase() === 'admin'
      ? t('admin.settingsPage.superAdmin')
      : profile.role;

  // The stored session records when this sign-in happened, which is the only
  // real sign-in time available: the account row has no login timestamp.
  const signedInAt = loadSession()?.authenticatedAt ?? null;
  const lastSignIn = profile.lastSignIn ?? (signedInAt ? new Date(signedInAt).toISOString() : null);

  const formatLastSignIn = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const time = new Intl.DateTimeFormat(language, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    const day = date.toDateString() === new Date(now).toDateString()
      ? t('admin.settingsPage.today')
      : new Intl.DateTimeFormat(language, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(date);
    return `${day}, ${time}`;
  };

  return (
    <div className="admin-settings">
      <header className="admin-settings__header">
        <div className="admin-settings__intro">
          <h1>{t('admin.settingsPage.title')}</h1>
          <p className="admin-settings__tagline">{t('admin.settingsPage.subtitle')}</p>
          <p className="admin-settings__hint">{t('admin.settingsPage.subtitleHint')}</p>
        </div>
        <Button icon={faFloppyDisk} onClick={save} loading={saving} disabled={!data}>
          {t('admin.settingsPage.saveChanges')}
        </Button>
      </header>

      {notice && (
        <Feedback error={notice.error} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Feedback>
      )}

      <QueryState state={state}>
        <div className="admin-settings__layout">
          <div className="admin-settings__main">
            <section className="admin-settings__card">
              <div className="admin-settings__card-head">
                <h2>{t('admin.settingsPage.profileInfo')}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data}
                  onClick={() => setShowProfile(true)}
                >
                  {t('admin.settingsPage.edit')}
                </Button>
              </div>

              <div className="admin-profile">
                <div className="admin-profile__identity">
                  <span className="admin-profile__avatar">
                    <Avatar
                      src={profile.imageUrl}
                      name={profile.name}
                      email={profile.email}
                      size="lg"
                    />
                  </span>
                  <strong className="admin-profile__name">{profile.name || '—'}</strong>
                  <span className="admin-profile__role">{roleLabel}</span>
                  {profile.verified && (
                    <span className="admin-profile__verified">
                      <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
                      {t('admin.settingsPage.verified')}
                    </span>
                  )}
                </div>

                <dl className="admin-settings__fields">
                  <div>
                    <dt>{t('admin.settingsPage.fullName')}</dt>
                    <dd>{profile.name || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.settingsPage.phone')}</dt>
                    <dd>{profile.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.settingsPage.email')}</dt>
                    <dd>{profile.email || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.settingsPage.role')}</dt>
                    <dd>{roleLabel}</dd>
                  </div>
                </dl>
              </div>

              <dl className="admin-settings__fields admin-settings__fields--meta">
                <div>
                  <dt>{t('admin.settingsPage.lastSignInLabel')}</dt>
                  <dd>{formatLastSignIn(lastSignIn)}</dd>
                </div>
                <div>
                  <dt>{t('admin.settingsPage.locationLabel')}</dt>
                  <dd>{profile.location || '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.settingsPage.adminIdLabel')}</dt>
                  <dd>{profile.adminId || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="admin-settings__card">
              <h2>{t('admin.settingsPage.security')}</h2>
              <div className="admin-security">
                <div className="admin-security__notice">
                  <FontAwesomeIcon
                    icon={faShieldHalved}
                    className="admin-security__icon"
                    aria-hidden="true"
                  />
                  <div className="admin-security__text">
                    <strong>{t('admin.settingsPage.protectedTitle')}</strong>
                    <span>{t('admin.settingsPage.protectedHint')}</span>
                  </div>
                </div>
                <div className="admin-security__actions">
                  <Button variant="outline" icon={faLock} onClick={() => setShowPassword(true)}>
                    {t('admin.settingsPage.changePassword')}
                  </Button>
                  <Button variant="outline" icon={faShieldHalved}>
                    {t('admin.settingsPage.manage2FA')}
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <section className="admin-settings__card">
            <h2>{t('admin.settingsPage.notifications')}</h2>
            <div className="admin-pref-list">
              {notificationItems.map((key) => (
                <label key={key} className="admin-pref">
                  <input
                    type="checkbox"
                    checked={notifs[key] ?? false}
                    onChange={() => toggleNotification(key)}
                  />
                  <span className="admin-pref__switch" aria-hidden="true" />
                  <span className="admin-pref__text">
                    <strong>{t(`admin.settingsPage.${key}`)}</strong>
                    <span>{t(`admin.settingsPage.${key}Hint`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </QueryState>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} />}

      {showProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={() => {
            setShowProfile(false);
            setNotice({ error: false, text: t('admin.settingsPage.saved') });
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminSettings;
