import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './ListPages.css';

const appointments = [
  { id: 'PO-4031', patient: 'Ahmed Al-Masri', center: 'MotionCare Center', therapist: 'Dr. Lina Haddad', service: 'Knee rehab', datetime: '2026-09-27T08:30', status: 'confirmed' },
  { id: 'PO-4032', patient: 'Layla Hassan', center: 'Al Noor Rehabilitation', therapist: 'Dr. Karim Nasser', service: 'Manual therapy', datetime: '2026-09-27T10:00', status: 'pending' },
  { id: 'PO-4033', patient: 'Mohammed Saleh', center: 'Healing Hands Clinic', therapist: 'Dr. Sara Ali', service: 'Sports rehab', datetime: '2026-09-28T14:00', status: 'completed' },
];

function AdminAppointments() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');

  // Formats sample timestamps with the current language and direction.
  const formatDateTime = (value) =>
    new Intl.DateTimeFormat(language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('admin.appointments.title')}</h1>
          <p>{t('admin.appointments.subtitle')}</p>
        </div>
        <Button icon={faPlus}>{t('admin.appointments.new')}</Button>
      </header>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.appointments.search')} />
        </div>
        <select className="admin-select"><option>{t('admin.allStatuses')}</option></select>
        <select className="admin-select"><option>{t('admin.allCenters')}</option></select>
        <input type="text" className="admin-select" placeholder={t('admin.appointments.dateRange')} style={{ padding: '10px 12px' }} />
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.appointments.id')}</th>
              <th>{t('admin.appointments.patient')}</th>
              <th>{t('admin.appointments.center')}</th>
              <th>{t('admin.appointments.therapist')}</th>
              <th>{t('admin.appointments.service')}</th>
              <th>{t('admin.appointments.dateTime')}</th>
              <th>{t('center.status')}</th>
              <th>{t('center.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.id}</strong></td>
                <td>{a.patient}</td>
                <td>{a.center}</td>
                <td>{a.therapist}</td>
                <td>{a.service}</td>
                <td>{formatDateTime(a.datetime)}</td>
                <td>
                  <span className={`admin-badge admin-badge--${a.status}`}>{t(`admin.status.${a.status}`)}</span>
                </td>
                <td>
                  <button className="admin-icon-button"><FontAwesomeIcon icon={faEllipsisV} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-pagination">
          <span>{t('admin.showing', { start: 1, end: 3, total: t('admin.appointments.total', { total: '1,248' }) })}</span>
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

export default AdminAppointments;
