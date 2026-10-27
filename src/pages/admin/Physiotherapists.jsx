import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faPlus, faSearch, faStar } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './ListPages.css';

const therapists = [
  { id: 'LIC-PH-7482', name: 'Dr. Lina Haddad', specialty: 'Sports rehabilitation', center: 'MotionCare Center', rating: '4.9', reviews: 124, status: 'active' },
  { id: 'LIC-PH-7483', name: 'Dr. Karim Nasser', specialty: 'Manual therapy', center: 'Al Noor Rehabilitation', rating: '4.8', reviews: 98, status: 'pending' },
];

function AdminPhysiotherapists() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('admin.therapists.title')}</h1>
          <p>{t('admin.therapists.subtitle')}</p>
        </div>
        <Button icon={faPlus}>{t('admin.therapists.add')}</Button>
      </header>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.therapists.search')} />
        </div>
        <select className="admin-select"><option>{t('admin.allSpecialties')}</option></select>
        <select className="admin-select"><option>{t('admin.allCenters')}</option></select>
        <select className="admin-select"><option>{t('admin.allStatuses')}</option></select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.therapists.name')}</th>
              <th>{t('admin.therapists.specialty')}</th>
              <th>{t('admin.therapists.center')}</th>
              <th>{t('admin.therapists.rating')}</th>
              <th>{t('center.status')}</th>
              <th>{t('center.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {therapists.map((therapist) => (
              <tr key={therapist.id}>
                <td>
                  <div className="admin-table__primary">
                    <strong>{therapist.name}</strong>
                    <span>{therapist.id}</span>
                  </div>
                </td>
                <td>{therapist.specialty}</td>
                <td>{therapist.center}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FontAwesomeIcon icon={faStar} style={{ color: '#f59e0b' }} />
                    {therapist.rating} ({therapist.reviews})
                  </span>
                </td>
                <td>
                  <span className={`admin-badge admin-badge--${therapist.status}`}>{t(`admin.status.${therapist.status}`)}</span>
                </td>
                <td>
                  <button className="admin-icon-button"><FontAwesomeIcon icon={faEllipsisV} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-pagination">
          <span>{t('admin.showing', { start: 1, end: 2, total: t('admin.therapists.total', { total: '346' }) })}</span>
          <div className="admin-pagination__pages">
            <button className="is-active">1</button>
            <button>2</button>
            <button>3</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPhysiotherapists;
