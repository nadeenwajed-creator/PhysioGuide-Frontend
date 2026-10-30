import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery from './useAdminQuery.js';
import { QueryState } from './AdminUI.jsx';
import './Settings.css';

function PasswordModal({ onClose }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError(t('auth.passwordMismatch') || 'Passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await callAdmin('changeAdminPassword', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.message || t('admin.state.error'));
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="admin-modal-backdrop" onClick={onClose}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal__header">
            <h2>{t('admin.settingsPage.changePassword')}</h2>
            <button className="admin-icon-button" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <p style={{ padding: '24px', textAlign: 'center', color: 'var(--color-success)' }}>
            <FontAwesomeIcon icon={faCheckCircle} /> Password changed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h2>{t('admin.settingsPage.changePassword')}</h2>
          <button className="admin-icon-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={submit} className="admin-modal__form">
          <label>
            Current password
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              required
            />
          </label>
          {error && <p className="admin-modal__error">{error}</p>}
          <div className="admin-modal__actions">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('center.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('admin.state.loading') : t('admin.settingsPage.changePassword')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminSettings() {
  const { t, language } = useLanguage();
  const state = useAdminQuery('getAdminSettings');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState(null);

  const data = state.data;
  const profile = data?.profile ?? {};
  // Use the fetched notifications as the base, overlay local edits.
  const notifs = notifications ?? data?.notifications ?? {};

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const base = prev ?? data?.notifications ?? {};
      return { ...base, [key]: !base[key] };
    });
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await callAdmin('saveAdminSettings', { notifications: notifs });
      state.reload();
    } catch {
      // error swallowed; settings page will re-fetch
    } finally {
      setSaving(false);
    }
  }, [notifs, state]);

  const notificationItems = [
    { key: 'approvalRequests' },
    { key: 'appointmentUpdates' },
    { key: 'reportedReviews' },
    { key: 'systemAlerts' },
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
        <Button onClick={save} disabled={saving}>
          {saving ? t('admin.state.loading') : t('admin.settingsPage.saveChanges')}
        </Button>
      </header>

      <QueryState state={state}>
        <div className="admin-settings__grid">
          <div className="admin-settings__column">
            <div className="admin-card">
              <h2>{t('admin.settingsPage.profileInfo')}</h2>
              <div className="admin-profile">
                <div className="admin-profile__avatar" />
                <div className="admin-profile__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>{profile.name || 'Admin'}</strong>
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
                    <span>
                      {t('admin.settingsPage.adminId', { id: profile.adminId })}
                    </span>
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
                <Button variant="outline">
                  {t('admin.settingsPage.manage2FA')}
                </Button>
              </div>
            </div>
          </div>

          <div className="admin-settings__column">
            <div className="admin-card">
              <h2>{t('admin.settingsPage.notifications')}</h2>
              <div className="admin-toggles">
                {notificationItems.map((item) => (
                  <label key={item.key} className="admin-toggle">
                    <span>{t(`admin.settingsPage.${item.key}`)}</span>
                    <input
                      type="checkbox"
                      checked={notifs[item.key] ?? false}
                      onChange={() => toggleNotification(item.key)}
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
