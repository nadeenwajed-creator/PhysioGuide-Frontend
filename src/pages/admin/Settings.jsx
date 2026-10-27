import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './Settings.css';

function AdminSettings() {
  const { t, language } = useLanguage();

  const notificationItems = [
    { key: 'approvalRequests', enabled: true },
    { key: 'appointmentUpdates', enabled: true },
    { key: 'reportedReviews', enabled: true },
    { key: 'systemAlerts', enabled: false },
  ];

  return (
    <div className="admin-settings">
      <header className="admin-list-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('admin.settingsPage.title')}</h1>
          <p>{t('admin.settingsPage.subtitle')}</p>
        </div>
        <Button>{t('admin.settingsPage.saveChanges')}</Button>
      </header>

      <div className="admin-settings__grid">
        <div className="admin-settings__column">
          <div className="admin-card">
            <h2>{t('admin.settingsPage.profileInfo')}</h2>
            <div className="admin-profile">
              <div className="admin-profile__avatar" />
              <div className="admin-profile__info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong>Maya Al-Hassan</strong>
                  <span className="admin-badge admin-badge--active">
                    <FontAwesomeIcon icon={faCheckCircle} /> {t('admin.settingsPage.superAdmin')}
                  </span>
                </div>
                <span>{t('admin.settingsPage.lastSignIn', {
                  time: new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-10-27T09:24')),
                })}</span>
                <span>{t('admin.settingsPage.location', { location: language === 'ar' ? 'الرياض، السعودية' : 'Riyadh, Saudi Arabia' })}</span>
                <span>{t('admin.settingsPage.adminId', { id: 'ADM-0018' })}</span>
                <Button variant="outline" size="sm" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>{t('admin.settingsPage.edit')}</Button>
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
              <Button variant="outline">{t('admin.settingsPage.changePassword')}</Button>
              <Button variant="outline">{t('admin.settingsPage.manage2FA')}</Button>
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
                  <input type="checkbox" defaultChecked={item.enabled} />
                  <span className="admin-toggle__slider" />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
