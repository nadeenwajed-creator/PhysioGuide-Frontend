import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './ListPages.css';

const patients = [
  { id: 'PAT-1001', name: 'Ahmed Al-Masri', email: 'ahmed@example.com', age: 28, city: 'Jeddah', appointments: 12, lastVisit: '2026-10-10', status: 'active' },
  { id: 'PAT-1002', name: 'Layla Hassan', email: 'layla@example.com', age: 35, city: 'Riyadh', appointments: 8, lastVisit: '2026-10-08', status: 'active' },
  { id: 'PAT-1003', name: 'Mohammed Saleh', email: 'mohammed@example.com', age: 42, city: 'Dammam', appointments: 5, lastVisit: '2026-09-25', status: 'inactive' },
];

function AdminPatients() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');

  // Formats fixed sample dates with the current language.
  const formatDate = (value) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat(language, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header">
        <div>
          <h1>{t('admin.patients.title')}</h1>
          <p>{t('admin.patients.subtitle')}</p>
        </div>
      </header>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.patients.search')} />
        </div>
        <select className="admin-select"><option>{t('admin.allStatuses')}</option></select>
        <select className="admin-select"><option>{t('admin.allCities')}</option></select>
        <select className="admin-select"><option>{t('admin.recentlyActive')}</option></select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.patients.patient')}</th>
              <th>{t('admin.patients.age')}</th>
              <th>{t('admin.patients.city')}</th>
              <th>{t('admin.patients.appointments')}</th>
              <th>{t('admin.patients.lastVisit')}</th>
              <th>{t('center.status')}</th>
              <th>{t('center.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>
                  <div className="admin-table__primary">
                    <strong>{patient.name}</strong>
                    <span>{patient.email}</span>
                  </div>
                </td>
                <td>{patient.age}</td>
                <td>{patient.city}</td>
                <td>{patient.appointments}</td>
                <td>{formatDate(patient.lastVisit)}</td>
                <td>
                  <span className={`admin-badge admin-badge--${patient.status}`}>{t(`admin.status.${patient.status}`)}</span>
                </td>
                <td>
                  <button className="admin-icon-button"><FontAwesomeIcon icon={faEllipsisV} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-pagination">
          <span>{t('admin.showing', { start: 1, end: 3, total: t('admin.patients.total', { total: '8,492' }) })}</span>
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

export default AdminPatients;
