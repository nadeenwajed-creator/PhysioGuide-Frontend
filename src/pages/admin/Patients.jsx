import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue, useStatusOverride } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import './ListPages.css';

function StatusMenu({ patientId, current, onChanged }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const statuses = ['active', 'inactive', 'suspended'].filter((s) => s !== current);

  return (
    <div className="admin-table__actions" style={{ position: 'relative' }}>
      <button
        className="admin-icon-button"
        aria-label={t('center.actions')}
        onClick={() => setOpen(!open)}
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </button>
      {open && (
        <div className="admin-dropdown">
          {statuses.map((status) => (
            <button
              key={status}
              className="admin-dropdown__item"
              onClick={() => {
                setOpen(false);
                onChanged(patientId, status);
              }}
            >
              {t(`admin.status.${status}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPatients() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    city: '',
    sort: '',
    page: 1,
    pageSize: 5,
  });

  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminPatients', { ...filters, search });

  const { begin, revert, reconcile } = useStatusOverride();
  const data = state.data;
  const options = data?.filters ?? { cities: [] };
  const number = new Intl.NumberFormat(language);

  // Reconcile overrides once the refetched list arrives.
  if (data?.items) reconcile(data.items);

  const changeStatus = async (id, status) => {
    begin(id, status);
    try {
      await callAdmin('setAdminPatientStatus', { id, status });
      state.reload();
    } catch {
      revert(id);
    }
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
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={t('admin.patients.search')}
          />
        </div>
        <select
          className="admin-select"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label={t('center.status')}
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="active">{t('admin.status.active')}</option>
          <option value="inactive">{t('admin.status.inactive')}</option>
          <option value="suspended">{t('admin.status.suspended')}</option>
        </select>
        <select
          className="admin-select"
          value={filters.city}
          onChange={(e) => update({ city: e.target.value })}
          aria-label={t('admin.allCities')}
        >
          <option value="">{t('admin.allCities')}</option>
          {options.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
          aria-label={t('admin.recentlyActive')}
        >
          <option value="">{t('admin.recentlyActive')}</option>
          <option value="recent">{t('admin.recentlyActive')}</option>
        </select>
      </div>

      <QueryState state={state} empty={!data?.items?.length}>
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
              {data?.items?.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="admin-table__primary">
                      <strong>{patient.name}</strong>
                      <span>{patient.email}</span>
                    </div>
                  </td>
                  <td>{patient.age ?? '—'}</td>
                  <td>{patient.city || '—'}</td>
                  <td>{patient.appointments}</td>
                  <td>
                    {patient.lastVisit
                      ? formatDate(patient.lastVisit, language)
                      : '—'}
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge--${patient.status}`}>
                      {t(`admin.status.${patient.status}`)}
                    </span>
                  </td>
                  <td>
                    <StatusMenu
                      patientId={patient.id}
                      current={patient.status}
                      onChanged={changeStatus}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={data?.total ?? 0}
            totalLabel={t('admin.patients.total', {
              total: number.format(data?.total ?? 0),
            })}
            onChange={(page) => update({ page })}
          />
        </div>
      </QueryState>
    </div>
  );
}

export default AdminPatients;
