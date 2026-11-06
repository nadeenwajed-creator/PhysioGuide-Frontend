import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { faEye, faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge.jsx';
import { ConfirmDialog, Feedback } from '../../components/center/CenterUI.jsx';
import { callAdmin } from '../../services/adminService.js';
import RowActions from './RowActions.jsx';
import { CenterEditDialog } from './AdminRecordDialogs.jsx';
import useAdminQuery, { useDebouncedValue } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import './ListPages.css';

function AdminCenters() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    specialty: '',
    city: '',
    page: 1,
    pageSize: 10,
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

      {notice && (
        <Feedback error={notice.error} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Feedback>
      )}

      <div className="admin-table-wrapper">
        {/* Filters live inside the table card, like the center pages. */}
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
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.centers.nameId')}</th>
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
                      <RowActions
                        label={t('center.actions')}
                        items={[
                          {
                            label: t('admin.actions.view'),
                            icon: faEye,
                            onSelect: () => navigate(`/admin/centers/${center.id}`),
                          },
                          {
                            label: t('admin.actions.edit'),
                            icon: faPen,
                            onSelect: () => setEditId(center.id),
                          },
                          {
                            label: t('admin.actions.delete'),
                            icon: faTrashCan,
                            danger: true,
                            onSelect: () => setDeleteTarget(center),
                          },
                        ]}
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
            onPageSizeChange={(value) => update({ pageSize: Number(value) })}
          />
        </QueryState>
      </div>

      {editId && (
        <CenterEditDialog
          id={editId}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null);
            setNotice({ error: false, text: t('admin.actions.updated') });
            state.reload();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          danger
          title={t('admin.actions.deleteTitle', { name: deleteTarget.name })}
          description={t('admin.actions.deleteCenterBody')}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            // A refusal (e.g. a center that still has therapists) throws, so
            // the dialog shows the reason and stays open.
            await callAdmin('deleteAdminCenter', { id: deleteTarget.id });
            setNotice({ error: false, text: t('admin.actions.deleted') });
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminCenters;
