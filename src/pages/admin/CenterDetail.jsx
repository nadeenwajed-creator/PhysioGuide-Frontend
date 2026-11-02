import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCheck, faTimes, faMinus } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge.jsx';
import { ConfirmDialog } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery from './useAdminQuery.js';
import { QueryState } from './AdminUI.jsx';
import './CenterDetail.css';

const tabs = ['overview', 'documents', 'photos'];

const confirmCopy = {
  approved: { title: 'admin.confirm.approveTitle', text: 'admin.confirm.approveText' },
  rejected: { title: 'admin.confirm.rejectTitle', text: 'admin.confirm.rejectText' },
  suspended: { title: 'admin.confirm.suspendTitle', text: 'admin.confirm.suspendText' },
};

function AdminCenterDetail() {
  const { id } = useParams();
  const { t, dir, language } = useLanguage();
  const state = useAdminQuery('getAdminCenter', { id });
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingStatus, setPendingStatus] = useState(null);

  const center = state.data;

  // Throwing keeps the confirmation dialog open so it can show the failure.
  async function applyStatus() {
    await callAdmin('setAdminCenterStatus', { id, status: pendingStatus });
    state.reload();
  }

  return (
    <div className="admin-center-detail">
      <header className="admin-center-detail__header">
        <Link to="/admin/centers" className="admin-back-link">
          <FontAwesomeIcon icon={dir === 'rtl' ? faArrowRight : faArrowLeft} />
          {t('admin.center.back')}
        </Link>

        <QueryState state={state}>
          <div className="admin-center-detail__title-row">
            <div className="admin-center-detail__title">
              <Avatar
                src={center?.imageUrl}
                name={center?.name}
                email={center?.email}
                size="lg"
                className="admin-center-detail__image"
              />
              <div>
                <h1>{center?.name}</h1>
                <span>{t('admin.center.id', { id: center?.id ?? id })}</span>
              </div>
            </div>
            <StatusBadge status={center?.status ?? 'pending'}>
              {t(`admin.status.${center?.status ?? 'pending'}`)}
            </StatusBadge>
          </div>
        </QueryState>
      </header>

      <QueryState state={state}>
        <div className="admin-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`admin-tab${activeTab === tab ? ' is-active' : ''}`}
              aria-current={activeTab === tab ? 'true' : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {t(`admin.center.tab.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="admin-card">
            <h2>{t('admin.center.tab.overview')}</h2>
            <div className="admin-key-value">
              <div>
                <span>{t('admin.center.field.location')}</span>
                <strong>{center?.location || '—'}</strong>
              </div>
              <div>
                <span>{t('admin.center.field.manager')}</span>
                <strong>{center?.manager || '—'}</strong>
              </div>
              <div>
                <span>{t('admin.center.field.therapists')}</span>
                <strong>{center?.therapists ?? 0}</strong>
              </div>
              <div>
                <span>{t('admin.center.field.specialties')}</span>
                <strong>{(center?.specialties || []).join(' - ') || '—'}</strong>
              </div>
              <div>
                <span>{t('admin.center.field.submitted')}</span>
                <strong>{center?.submittedAt ? formatDate(center.submittedAt, language) : '—'}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="admin-card">
            <h2>{t('admin.center.tab.documents')}</h2>
            {center?.documents?.length ? (
              <ul className="admin-document-list">
                {center.documents.map((doc) => (
                  <li key={doc.id}>{doc.name}</li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty-text">{t('admin.center.documents.empty')}</p>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="admin-card">
            <h2>{t('admin.center.tab.photos')}</h2>
            {center?.photos?.length ? (
              <div className="admin-photo-grid">
                {center.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt=""
                    className="admin-photo-grid__item"
                  />
                ))}
              </div>
            ) : (
              <p className="admin-empty-text">{t('admin.center.photos.empty')}</p>
            )}
          </div>
        )}

        <div className="admin-action-bar">
          <Button
            variant="primary"
            icon={faCheck}
            disabled={center?.status === 'approved'}
            onClick={() => setPendingStatus('approved')}
          >
            {t('admin.center.approve')}
          </Button>
          <Button
            variant="danger"
            icon={faTimes}
            disabled={center?.status === 'rejected'}
            onClick={() => setPendingStatus('rejected')}
          >
            {t('admin.center.reject')}
          </Button>
          <Button
            variant="outline"
            icon={faMinus}
            disabled={center?.status === 'suspended'}
            onClick={() => setPendingStatus('suspended')}
          >
            {t('admin.center.suspend')}
          </Button>
        </div>
      </QueryState>

      {pendingStatus && (
        <ConfirmDialog
          title={t(confirmCopy[pendingStatus].title)}
          description={t(confirmCopy[pendingStatus].text)}
          danger={pendingStatus !== 'approved'}
          onClose={() => setPendingStatus(null)}
          onConfirm={applyStatus}
        />
      )}
    </div>
  );
}

export default AdminCenterDetail;
