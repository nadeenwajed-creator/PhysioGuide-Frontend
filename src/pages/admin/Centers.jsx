import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import useAdminQuery, { useDebouncedValue } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import './ListPages.css';

function AdminCenters() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    specialty: '',
    city: '',
    page: 1,
    pageSize: 5,
  });

  // Changing a filter returns to the first page; page clicks keep the filters.
  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminCenters', { ...filters, search });

  const data = state.data;
  const options = data?.filters ?? { cities: [], specialties: [] };
  const number = new Intl.NumberFormat(language);

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
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={t('admin.centers.search')}
          />
        </div>
        <select
          className="admin-select"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label={t('center.status')}
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="pending">{t('admin.status.pending')}</option>
          <option value="approved">{t('admin.status.approved')}</option>
          <option value="rejected">{t('admin.status.rejected')}</option>
          <option value="suspended">{t('admin.status.suspended')}</option>
        </select>
        <select
          className="admin-select"
          value={filters.specialty}
          onChange={(e) => update({ specialty: e.target.value })}
          aria-label={t('admin.allSpecialties')}
        >
          <option value="">{t('admin.allSpecialties')}</option>
          {options.specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
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
      </div>

      <QueryState state={state} empty={!state.data?.items?.length}>
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
              {data?.items?.map((center) => (
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
                      <button className="admin-icon-button" aria-label={t('center.actions')}>
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={data?.total ?? 0}
            totalLabel={t('admin.centers.total', { total: number.format(data?.total ?? 0) })}
            onChange={(page) => update({ page })}
          />
        </div>
      </QueryState>
    </div>
  );
}

export default AdminCenters;
