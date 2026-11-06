import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faBuilding,
  faCalendarDays,
  faChevronDown,
  faFileLines,
  faFolderOpen,
  faImages,
  faLocationDot,
  faShieldHalved,
  faUpRightFromSquare,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {
  faCircleCheck,
  faCircleXmark,
  faSquareMinus,
} from '@fortawesome/free-regular-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
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
  const status = center?.status ?? 'pending';
  const number = new Intl.NumberFormat(language);

  // The overview is the same set of rows in the same order for every centre.
  const overviewRows = [
    { key: 'location', icon: faLocationDot, value: center?.location || '—' },
    { key: 'manager', icon: faUser, value: center?.manager || '—' },
    { key: 'therapists', icon: faFileLines, value: number.format(center?.therapists ?? 0) },
    {
      key: 'specialties',
      icon: faShieldHalved,
      value: (center?.specialties || []).join(' - ') || '—',
    },
    {
      key: 'submitted',
      icon: faCalendarDays,
      value: center?.submittedAt ? formatDate(center.submittedAt, language) : '—',
    },
  ];

  // Throwing keeps the confirmation dialog open so it can show the failure.
  async function applyStatus() {
    await callAdmin('setAdminCenterStatus', { id, status: pendingStatus });
    state.reload();
  }

  return (
    <div className="admin-center-detail">
      <Link to="/admin/centers" className="admin-back-link">
        <FontAwesomeIcon icon={dir === 'rtl' ? faArrowRight : faArrowLeft} aria-hidden="true" />
        {t('admin.center.back')}
      </Link>

      <QueryState state={state}>
        <section className="admin-center-detail__card">
          <header className="admin-center-detail__header">
            <div className="admin-center-detail__photo">
              {center?.imageUrl ? (
                <img src={center.imageUrl} alt="" />
              ) : (
                <span className="admin-center-detail__photo-fallback" aria-hidden="true">
                  <FontAwesomeIcon icon={faBuilding} />
                </span>
              )}
            </div>
            <div className="admin-center-detail__intro">
              <h1>{center?.name}</h1>
              <div className="admin-center-detail__meta">
                <span className="admin-center-detail__code">{center?.id ?? id}</span>
                <span
                  className={`admin-center-detail__status admin-center-detail__status--${status}`}
                >
                  {t(`admin.status.${status}`)}
                  <FontAwesomeIcon icon={faChevronDown} aria-hidden="true" />
                </span>
              </div>
            </div>
          </header>

          <div className="admin-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`admin-tab${activeTab === tab ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(`admin.center.tab.${tab}`)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="admin-details" role="tabpanel">
              {overviewRows.map((row) => (
                <div className="admin-details__row" key={row.key}>
                  <span className="admin-details__icon" aria-hidden="true">
                    <FontAwesomeIcon icon={row.icon} />
                  </span>
                  <span className="admin-details__label">
                    {t(`admin.center.field.${row.key}`)}
                  </span>
                  <strong className="admin-details__value">{row.value}</strong>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="admin-center-detail__panel" role="tabpanel">
              {center?.documents?.length ? (
                <ul className="admin-file-list">
                  {center.documents.map((doc) => (
                    <li key={doc.id}>
                      <span className="admin-file-list__icon" aria-hidden="true">
                        <FontAwesomeIcon icon={faFileLines} />
                      </span>
                      <span className="admin-file-list__text">
                        <strong>
                          {doc.name || doc.type || t('admin.center.tab.documents')}
                        </strong>
                        {doc.uploadedAt && (
                          <small>{formatDate(doc.uploadedAt, language)}</small>
                        )}
                      </span>
                      {doc.url && (
                        <a
                          className="admin-file-list__link"
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('center.view')}
                          <FontAwesomeIcon icon={faUpRightFromSquare} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="admin-center-detail__empty">
                  <FontAwesomeIcon icon={faFolderOpen} aria-hidden="true" />
                  <p>{t('admin.center.documents.empty')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="admin-center-detail__panel" role="tabpanel">
              {center?.photos?.length ? (
                <div className="admin-media-grid">
                  {center.photos.map((photo) => (
                    <a
                      key={photo.id}
                      className="admin-media-grid__item"
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={photo.url} alt="" loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="admin-center-detail__empty">
                  <FontAwesomeIcon icon={faImages} aria-hidden="true" />
                  <p>{t('admin.center.photos.empty')}</p>
                </div>
              )}
            </div>
          )}

          <div className="admin-action-bar">
            <Button
              className="admin-action admin-action--approve"
              icon={faCircleCheck}
              disabled={status === 'approved'}
              onClick={() => setPendingStatus('approved')}
            >
              {t('admin.center.approve')}
            </Button>
            <Button
              className="admin-action admin-action--reject"
              icon={faCircleXmark}
              disabled={status === 'rejected'}
              onClick={() => setPendingStatus('rejected')}
            >
              {t('admin.center.reject')}
            </Button>
            <Button
              className="admin-action admin-action--suspend"
              icon={faSquareMinus}
              disabled={status === 'suspended'}
              onClick={() => setPendingStatus('suspended')}
            >
              {t('admin.center.suspend')}
            </Button>
          </div>
        </section>
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
