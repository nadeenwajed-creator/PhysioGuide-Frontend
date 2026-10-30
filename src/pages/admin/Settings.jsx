import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import { Feedback } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
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

function AdminSettings() {
  const { t, language } = useLanguage();
  const state = useAdminQuery('getAdminSettings');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [notice, setNotice] = useState(null);

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

  const formatLastSignIn = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="admin-settings">
      <header
        className="admin-list-page__header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>{t('admin.settingsPage.title')}</h1>
          <p>{t('admin.settingsPage.subtitle')}</p>
        </div>
        <Button onClick={save} loading={saving} disabled={!data}>
          {t('admin.settingsPage.saveChanges')}
        </Button>
      </header>

      {notice && (
        <Feedback error={notice.error} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Feedback>
      )}

      <QueryState state={state}>
        <div className="admin-settings__grid">
          <div className="admin-settings__column">
            <div className="admin-card">
              <h2>{t('admin.settingsPage.profileInfo')}</h2>
              <div className="admin-profile">
                <div className="admin-profile__avatar" />
                <div className="admin-profile__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>{profile.name || '—'}</strong>
                    {profile.verified && (
                      <span className="admin-badge admin-badge--active">
                        <FontAwesomeIcon icon={faCheckCircle} />{' '}
                        {profile.role || t('admin.settingsPage.superAdmin')}
                      </span>
                    )}
                  </div>
                  <span>
                    {t('admin.settingsPage.lastSignIn', {
                      time: formatLastSignIn(profile.lastSignIn),
                    })}
                  </span>
                  <span>
                    {t('admin.settingsPage.location', {
                      location: profile.location || '—',
                    })}
                  </span>
                  {profile.adminId && (
                    <span>{t('admin.settingsPage.adminId', { id: profile.adminId })}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-card">
              <h2>{t('admin.settingsPage.security')}</h2>
              <div className="admin-alert">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>{t('admin.settingsPage.protected')}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="outline" onClick={() => setShowPassword(true)}>
                  {t('admin.settingsPage.changePassword')}
                </Button>
                <Button variant="outline">{t('admin.settingsPage.manage2FA')}</Button>
              </div>
            </div>
          </div>

          <div className="admin-settings__column">
            <div className="admin-card">
              <h2>{t('admin.settingsPage.notifications')}</h2>
              <div className="admin-toggles">
                {notificationItems.map((key) => (
                  <label key={key} className="admin-toggle">
                    <span>{t(`admin.settingsPage.${key}`)}</span>
                    <input
                      type="checkbox"
                      checked={notifs[key] ?? false}
                      onChange={() => toggleNotification(key)}
                    />
                    <span className="admin-toggle__slider" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </QueryState>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
}

export default AdminSettings;
