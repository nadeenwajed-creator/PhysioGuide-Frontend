import { useState } from 'react';
import { Link } from 'react-router-dom';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge.jsx';
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
        <SearchBar
          value={filters.search}
          onChange={(value) => update({ search: value })}
          placeholder={t('admin.centers.search')}
          ariaLabel={t('admin.centers.search')}
        />
        <FilterSelect
          value={filters.status}
          onChange={(value) => update({ status: value })}
          ariaLabel={t('center.status')}
          options={[
            { value: '', label: t('admin.allStatuses') },
            { value: 'pending', label: t('admin.status.pending') },
            { value: 'approved', label: t('admin.status.approved') },
            { value: 'rejected', label: t('admin.status.rejected') },
            { value: 'suspended', label: t('admin.status.suspended') },
          ]}
        />
        <FilterSelect
          value={filters.specialty}
          onChange={(value) => update({ specialty: value })}
          ariaLabel={t('admin.allSpecialties')}
          options={[
            { value: '', label: t('admin.allSpecialties') },
            ...options.specialties.map((specialty) => ({
              value: specialty,
              label: specialty,
            })),
          ]}
        />
        <FilterSelect
          value={filters.city}
          onChange={(value) => update({ city: value })}
          ariaLabel={t('admin.allCities')}
          options={[
            { value: '', label: t('admin.allCities') },
            ...options.cities.map((city) => ({ value: city, label: city })),
          ]}
        />
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
                    <StatusBadge status={center.status}>
                      {t(`admin.status.${center.status}`)}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link to={`/admin/centers/${center.id}`} className="admin-link">
                        {t('center.view')}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={faEllipsisV}
                        aria-label={t('center.actions')}
                      />
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
