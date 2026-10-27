import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './ListPages.css';

const centers = [
  { id: 'CTR-4821', name: 'Al Noor Rehabilitation', manager: 'Faisal Omar', location: 'Jeddah', therapists: 18, status: 'pending' },
  { id: 'CTR-4822', name: 'MotionCare Center', manager: 'Sara Khalid', location: 'Riyadh', therapists: 24, status: 'approved' },
  { id: 'CTR-4823', name: 'Healing Hands Clinic', manager: 'Omar Nasser', location: 'Dammam', therapists: 12, status: 'approved' },
];

function AdminCenters() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header">
        <div>
          <h1>{t('admin.centers.title')}</h1>
          <p>{t('admin.centers.subtitle')}</p>
        </div>
      </header>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.centers.search')} />
        </div>
        <select className="admin-select">
          <option>{t('admin.allStatuses')}</option>
          <option>{t('admin.status.pending')}</option>
          <option>{t('admin.status.approved')}</option>
          <option>{t('admin.status.rejected')}</option>
          <option>{t('admin.status.suspended')}</option>
        </select>
        <select className="admin-select">
          <option>{t('admin.allSpecialties')}</option>
        </select>
        <select className="admin-select">
          <option>{t('admin.allCities')}</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.centers.nameId')}</th>
              <th>{t('admin.centers.manager')}</th>
              <th>{t('admin.centers.location')}</th>
              <th>{t('admin.centers.activeTherapists')}</th>
              <th>{t('center.status')}</th>
              <th>{t('center.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((center) => (
              <tr key={center.id}>
                <td>
                  <div className="admin-table__primary">
                    <strong>{center.name}</strong>
                    <span>{center.id}</span>
                  </div>
                </td>
                <td>{center.manager}</td>
                <td>{center.location}</td>
                <td>{center.therapists}</td>
                <td>
                  <span className={`admin-badge admin-badge--${center.status}`}>
                    {t(`admin.status.${center.status}`)}
                  </span>
                </td>
                <td>
                  <div className="admin-table__actions">
                    <Link to={`/admin/centers/${center.id}`} className="admin-link">
                      {t('center.view')}
                    </Link>
                    <button className="admin-icon-button" aria-label="More actions">
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminCenters;
