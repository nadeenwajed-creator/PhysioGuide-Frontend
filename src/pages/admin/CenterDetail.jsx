import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCheck, faTimes, faMinus } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './CenterDetail.css';

function AdminCenterDetail() {
  const { t, dir } = useLanguage();

  return (
    <div className="admin-center-detail">
      <header className="admin-center-detail__header">
        <Link to="/admin/centers" className="admin-back-link">
          <FontAwesomeIcon icon={dir === 'rtl' ? faArrowRight : faArrowLeft} />
          {t('admin.center.back')}
        </Link>
        <div className="admin-center-detail__title-row">
          <div className="admin-center-detail__title">
            <div className="admin-center-detail__image" />
            <div>
              <h1>Al Noor Rehabilitation</h1>
              <span>{t('admin.center.id', { id: 'CTR-4821' })}</span>
            </div>
          </div>
          <span className="admin-badge admin-badge--pending">{t('admin.status.pending')}</span>
        </div>
      </header>

      <div className="admin-tabs">
        <button className="admin-tab is-active">{t('admin.center.tab.overview')}</button>
        <button className="admin-tab">{t('admin.center.tab.documents')}</button>
        <button className="admin-tab">{t('admin.center.tab.photos')}</button>
      </div>

      <div className="admin-card">
        <h2>{t('admin.center.tab.overview')}</h2>
        <div className="admin-key-value">
          <div>
            <span>{t('admin.center.field.location')}</span>
            <strong>Jeddah, Saudi Arabia</strong>
          </div>
          <div>
            <span>{t('admin.center.field.manager')}</span>
            <strong>Faisal Omar</strong>
          </div>
          <div>
            <span>{t('admin.center.field.therapists')}</span>
            <strong>18</strong>
          </div>
          <div>
            <span>{t('admin.center.field.specialties')}</span>
            <strong>Orthopedic - Sports</strong>
          </div>
          <div>
            <span>{t('admin.center.field.submitted')}</span>
            <strong>24 Sep 2026</strong>
          </div>
        </div>
      </div>

      <div className="admin-action-bar">
        <Button variant="primary" icon={faCheck}>
          {t('admin.center.approve')}
        </Button>
        <Button variant="danger" icon={faTimes}>
          {t('admin.center.reject')}
        </Button>
        <Button variant="outline" icon={faMinus}>
          {t('admin.center.suspend')}
        </Button>
      </div>
    </div>
  );
}

export default AdminCenterDetail;
