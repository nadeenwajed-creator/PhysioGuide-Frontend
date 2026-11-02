import { useState } from 'react';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import { Feedback } from '../../components/center/CenterUI.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue, errorText } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import './ListPages.css';

const patientStatuses = ['active', 'inactive', 'suspended'];

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
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState(null);

  // Changing a filter returns to the first page; page clicks keep the filters.
  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminPatients', { ...filters, search });

  const data = state.data;
  const options = data?.filters ?? { cities: [] };
  const number = new Intl.NumberFormat(language);

  async function changeStatus(id, status) {
    setSavingId(id);
    setNotice(null);
    try {
      await callAdmin('setAdminPatientStatus', { id, status });
      state.reload();
    } catch (failure) {
      setNotice({ error: true, text: errorText(t, failure) });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header">
        <div>
          <h1>{t('admin.patients.title')}</h1>
          <p>{t('admin.patients.subtitle')}</p>
        </div>
      </header>

      <div className="admin-list-page__filters">
        <SearchBar
          value={filters.search}
          onChange={(value) => update({ search: value })}
          placeholder={t('admin.patients.search')}
          ariaLabel={t('admin.patients.search')}
        />
        <FilterSelect
          value={filters.status}
          onChange={(value) => update({ status: value })}
          ariaLabel={t('center.status')}
          options={[
            { value: '', label: t('admin.allStatuses') },
            ...patientStatuses.map((status) => ({
              value: status,
              label: t(`admin.status.${status}`),
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
        <FilterSelect
          value={filters.sort}
          onChange={(value) => update({ sort: value })}
          ariaLabel={t('admin.sort.default')}
          options={[
            { value: '', label: t('admin.sort.default') },
            { value: 'recent', label: t('admin.recentlyActive') },
          ]}
        />
      </div>

      {notice && (
        <Feedback error={notice.error} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Feedback>
      )}

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
                    <div className="admin-table__person">
                      <Avatar
                        src={patient.imageUrl}
                        name={patient.name}
                        email={patient.email}
                        size="sm"
                      />
                      <div className="admin-table__primary">
                        <strong>{patient.name}</strong>
                        <span>{patient.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{patient.age ?? '—'}</td>
                  <td>{patient.city || '—'}</td>
                  <td>{patient.appointments}</td>
                  <td>{patient.lastVisit ? formatDate(patient.lastVisit, language) : '—'}</td>
                  <td>
                    <select
                      className={`admin-badge admin-badge--${patient.status}`}
                      value={patient.status}
                      aria-label={t('center.status')}
                      disabled={savingId === patient.id}
                      onChange={(e) => changeStatus(patient.id, e.target.value)}
                    >
                      {patientStatuses.map((status) => (
                        <option key={status} value={status}>
                          {t(`admin.status.${status}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={faEllipsisV}
                      aria-label={t('center.actions')}
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
