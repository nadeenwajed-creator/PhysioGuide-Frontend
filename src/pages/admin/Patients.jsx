import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { faEye, faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import { ConfirmDialog, Feedback } from '../../components/center/CenterUI.jsx';
import { callAdmin } from '../../services/adminService.js';
import RowActions from './RowActions.jsx';
import { PatientEditDialog } from './AdminRecordDialogs.jsx';
import useAdminQuery, { useDebouncedValue, errorText } from './useAdminQuery.js';
import { QueryState, AdminPagination, RecordDialog } from './AdminUI.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import './ListPages.css';

const patientStatuses = ['active', 'inactive', 'suspended'];

// The rows of the view dialog opened from a list row.
const patientRows = (patient, t, language) => [
  { label: t('admin.records.id'), value: patient.id },
  { label: t('admin.patients.patient'), value: patient.name },
  { label: t('admin.records.email'), value: patient.email },
  { label: t('admin.patients.age'), value: patient.age },
  { label: t('admin.patients.city'), value: patient.city },
  { label: t('admin.patients.appointments'), value: patient.appointments },
  {
    label: t('admin.patients.lastVisit'),
    value: patient.lastVisit ? formatDate(patient.lastVisit, language) : '',
  },
  { label: t('admin.records.status'), value: t(`admin.status.${patient.status}`) },
];

const genderLabel = (gender, t) =>
  gender === 'male'
    ? t('admin.records.genderMale')
    : gender === 'female'
      ? t('admin.records.genderFemale')
      : gender || '';

// An activity link opens a patient fetched by id, so the dialog shows the
// stored profile fields rather than the summary columns of a list row.
const patientProfileRows = (patient, t) => [
  { label: t('admin.records.id'), value: patient.id },
  { label: t('admin.patients.patient'), value: patient.name },
  { label: t('admin.records.email'), value: patient.email },
  { label: t('admin.records.phone'), value: patient.phone },
  { label: t('admin.records.city'), value: patient.city },
  { label: t('admin.records.gender'), value: genderLabel(patient.gender, t) },
  { label: t('admin.records.dateOfBirth'), value: patient.dateOfBirth },
  { label: t('admin.records.status'), value: t(`admin.status.${patient.status}`) },
];

function AdminPatients() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    city: '',
    sort: '',
    page: 1,
    pageSize: 10,
  });
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Changing a filter returns to the first page; page clicks keep the filters.
  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminPatients', { ...filters, search });

  // The activity log links here with ?patient=<id>; the list's view dialog is
  // the patient profile, so the record is fetched and opened on arrival.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedId = searchParams.get('patient');
  const linkedState = useAdminQuery(
    'getAdminPatient',
    { id: linkedId },
    { enabled: Boolean(linkedId) }
  );
  const linkedPatient = linkedState.data;

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

        <QueryState state={state} empty={!data?.items?.length}>
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
                    <RowActions
                      label={t('center.actions')}
                      items={[
                        {
                          label: t('admin.actions.view'),
                          icon: faEye,
                          onSelect: () => setViewTarget(patient),
                        },
                        {
                          label: t('admin.actions.edit'),
                          icon: faPen,
                          onSelect: () => setEditId(patient.id),
                        },
                        {
                          label: t('admin.actions.delete'),
                          icon: faTrashCan,
                          danger: true,
                          onSelect: () => setDeleteTarget(patient),
                        },
                      ]}
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
            onPageSizeChange={(value) => update({ pageSize: Number(value) })}
          />
        </QueryState>
      </div>

      {viewTarget && (
        <RecordDialog
          title={viewTarget.name}
          onClose={() => setViewTarget(null)}
          rows={patientRows(viewTarget, t, language)}
        />
      )}

      {linkedId && linkedPatient && (
        <RecordDialog
          title={linkedPatient.name}
          onClose={() => setSearchParams({}, { replace: true })}
          rows={patientProfileRows(linkedPatient, t)}
        />
      )}

      {editId && (
        <PatientEditDialog
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
          description={t('admin.actions.deletePatientBody')}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await callAdmin('deleteAdminPatient', { id: deleteTarget.id });
            setNotice({ error: false, text: t('admin.actions.deleted') });
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminPatients;
