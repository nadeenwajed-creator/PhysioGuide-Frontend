import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCheck, faTimes, faMinus } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery from './useAdminQuery.js';
import { QueryState } from './AdminUI.jsx';
import './CenterDetail.css';

function AdminCenterDetail() {
  const { id } = useParams();
  const { t, dir, language } = useLanguage();
  const state = useAdminQuery('getAdminCenter', { id });
  const [updating, setUpdating] = useState(null);

  const changeStatus = useCallback(
    async (status,reason) => {
      if (updating) return;
      setUpdating(status);
      try {
        await callAdmin('setAdminCenterStatus', { id, status, reason });
        state.reload();
      } catch {
        // error is swallowed; the reload will re-fetch the current status
      } finally {
        setUpdating(null);
      }
    },
    [id, updating, state],
  );

  const center = state.data;
  const tabKeys = ['overview', 'documents', 'photos'];
  const [activeTab, setActiveTab] = useState('overview');

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
              {center?.imageUrl ? (
                <img
                  src={center.imageUrl}
                  alt={center.name}
                  className="admin-center-detail__image"
                />
              ) : (
                <div className="admin-center-detail__image" />
              )}
              <div>
                <h1>{center?.name}</h1>
                <span>{t('admin.center.id', { id: center?.id ?? id })}</span>
              </div>
            </div>
            <span className={`admin-badge admin-badge--${center?.status}`}>
              {t(`admin.status.${center?.status ?? 'pending'}`)}
            </span>
          </div>
        </QueryState>
      </header>

      <QueryState state={state}>
        <div className="admin-tabs">
          {tabKeys.map((key) => (
            <button
              key={key}
              className={`admin-tab${activeTab === key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {t(`admin.center.tab.${key}`)}
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
                <strong>
                  {(center?.specialties || []).join(' - ') || '—'}
                </strong>
              </div>
              <div>
                <span>{t('admin.center.field.submitted')}</span>
                <strong>
                  {center?.submittedAt
                    ? formatDate(center.submittedAt, language)
                    : '—'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="admin-card">
            <h2>{t('admin.center.tab.documents')}</h2>
            {(center?.documents?.length ?? 0) === 0 ? (
              <p className="admin-empty-text">{t('admin.state.empty')}</p>
            ) : (
              <ul className="admin-document-list">
                {center.documents.map((doc) => (
                  <li key={doc.id}>{doc.name}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="admin-card">
            <h2>{t('admin.center.tab.photos')}</h2>
            {(center?.photos?.length ?? 0) === 0 ? (
              <p className="admin-empty-text">{t('admin.state.empty')}</p>
            ) : (
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
            )}
          </div>
        )}

        <div className="admin-action-bar">
          <Button
            variant="primary"
            icon={faCheck}
            disabled={!!updating || center?.status === 'approved'}
            onClick={() => changeStatus('approved')}
          >
            {updating === 'approved'
              ? t('admin.state.loading')
              : t('admin.center.approve')}
          </Button>
          <Button
            variant="danger"
            icon={faTimes}
            disabled={!!updating || center?.status === 'rejected'}
            onClick={() => changeStatus('rejected', 'Rejected by admin')}
          >
            {updating === 'rejected'
              ? t('admin.state.loading')
              : t('admin.center.reject')}
          </Button>
          <Button
            variant="outline"
            icon={faMinus}
            disabled={!!updating || center?.status === 'suspended'}
            onClick={() => changeStatus('suspended')}
          >
            {updating === 'suspended'
              ? t('admin.state.loading')
              : t('admin.center.suspend')}
          </Button>
        </div>
      </QueryState>
    </div>
  );
}

export default AdminCenterDetail;
