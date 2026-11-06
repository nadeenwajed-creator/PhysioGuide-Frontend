import { useState } from 'react';
import { faEye, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge.jsx';
import { ConfirmDialog, Feedback } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue, errorText } from './useAdminQuery.js';
import { QueryState, AdminPagination, RecordDialog } from './AdminUI.jsx';
import RowActions from './RowActions.jsx';
import { AppointmentEditDialog } from './AdminRecordDialogs.jsx';
import './ListPages.css';

// Fallback only: the list endpoint reports the statuses actually stored in the
// table, and the filter renders those so it can always match the status column.
const appointmentStatuses = ['pending', 'confirmed', 'approved', 'completed', 'cancelled', 'rejected'];

// The options endpoint feeds every select, so the form stays in sync with the
// centers, therapists, patients and services the backend currently allows.
function NewAppointmentModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const optionsState = useAdminQuery('getAdminAppointmentOptions');
  const options = optionsState.data;

  const [form, setForm] = useState({
    patientId: '',
    centerId: '',
    therapistId: '',
    serviceId: '',
    date: '',
    time: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const toOptions = (items, placeholder) => [
    { value: '', label: placeholder },
    ...(items || []).map((item) => ({ value: item.id, label: item.name })),
  ];

  const therapists = (options?.therapists || []).filter(
    (therapist) => !form.centerId || therapist.centerId === form.centerId
  );

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('createAdminAppointment', form);
      onCreated();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      title={t('admin.appointments.form.title')}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {t('center.cancel')}
          </Button>
          <Button
            type="submit"
            form="new-appointment-form"
            loading={saving}
            disabled={!options}
          >
            {t('admin.appointments.new')}
          </Button>
        </>
      }
    >
      {optionsState.error && (
        <div className="admin-state">
          <Feedback error>{errorText(t, optionsState.error)}</Feedback>
          <Button variant="outline" onClick={optionsState.reload}>
            {t('admin.state.retry')}
          </Button>
        </div>
      )}

      {optionsState.loading && (
        <p className="admin-state" role="status">
          {t('admin.state.loading')}
        </p>
      )}

      {options && (
        <form id="new-appointment-form" className="admin-form" onSubmit={submit} noValidate>
          <FormField
            label={t('admin.appointments.form.patient')}
            as="select"
            required
            value={form.patientId}
            onChange={(value) => set('patientId', value)}
            options={toOptions(options.patients, '—')}
            disabled={saving}
          />
          <FormField
            label={t('admin.appointments.form.center')}
            as="select"
            required
            value={form.centerId}
            onChange={(value) => {
              set('centerId', value);
              set('therapistId', '');
            }}
            options={toOptions(options.centers, '—')}
            disabled={saving}
          />
          <FormField
            label={t('admin.appointments.form.therapist')}
            as="select"
            value={form.therapistId}
            onChange={(value) => set('therapistId', value)}
            options={toOptions(therapists, '—')}
            disabled={saving}
          />
          <FormField
            label={t('admin.appointments.form.service')}
            as="select"
            required
            value={form.serviceId}
            onChange={(value) => set('serviceId', value)}
            options={toOptions(options.services, '—')}
            disabled={saving}
          />
          <FormField
            label={t('admin.appointments.form.date')}
            type="date"
            required
            value={form.date}
            onChange={(value) => set('date', value)}
            disabled={saving}
          />
          <FormField
            label={t('admin.appointments.form.time')}
            type="time"
            required
            value={form.time}
            onChange={(value) => set('time', value)}
            disabled={saving}
          />
          <Feedback error>{error}</Feedback>
        </form>
      )}
    </Modal>
  );
}

function AdminAppointments() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    center: '',
    date: '',
    page: 1,
    pageSize: 10,
  });
  const [showNew, setShowNew] = useState(false);
  const [notice, setNotice] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminAppointments', { ...filters, search });

  const data = state.data;
  const options = data?.filters ?? { centers: [], statuses: [] };
  const statuses = options.statuses?.length ? options.statuses : appointmentStatuses;
  const number = new Intl.NumberFormat(language);

  // The API sends the booked slot as local wall-clock text, so the parts are
  // read directly: new Date(string) would treat it as UTC and shift the time by
  // the browser's offset (moving late appointments to the wrong day).
  const formatDateTime = (value) => {
    if (!value) return '—';
    const parts = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value));
    if (!parts) return String(value);
    const [, year, month, day, hour, minute] = parts;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour ?? 12),
      Number(minute ?? 0)
    );
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(hour == null ? {} : { hour: '2-digit', minute: '2-digit' }),
    }).format(date);
  };

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header admin-list-page__header--actions">
        <div>
          <h1>{t('admin.appointments.title')}</h1>
          <p>{t('admin.appointments.subtitle')}</p>
        </div>
        <Button icon={faPlus} onClick={() => setShowNew(true)}>
          {t('admin.appointments.new')}
        </Button>
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
            placeholder={t('admin.appointments.search')}
            ariaLabel={t('admin.appointments.search')}
          />
          <FilterSelect
            value={filters.status}
            onChange={(value) => update({ status: value })}
            ariaLabel={t('center.status')}
            options={[
              { value: '', label: t('admin.allStatuses') },
              ...statuses.map((status) => ({
                value: status,
                label: t(`admin.status.${status}`),
              })),
            ]}
          />
          <FilterSelect
            value={filters.center}
            onChange={(value) => update({ center: value })}
            ariaLabel={t('admin.allCenters')}
            options={[
              { value: '', label: t('admin.allCenters') },
              ...options.centers.map((center) => ({
                value: center.id,
                label: center.name,
              })),
            ]}
          />
          <input
            type="date"
            className="admin-date"
            value={filters.date}
            onChange={(e) => update({ date: e.target.value })}
            aria-label={t('admin.appointments.form.date')}
            title={t('admin.appointments.form.date')}
          />
        </div>

        <QueryState state={state} empty={!data?.items?.length}>
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
              {data?.items?.map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    <strong>{appointment.id}</strong>
                  </td>
                  <td>
                    <div className="admin-table__person">
                      <Avatar
                        src={appointment.patientImage}
                        name={appointment.patient}
                        size="sm"
                      />
                      <div className="admin-table__primary">
                        <strong>{appointment.patient || '—'}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{appointment.center || '—'}</td>
                  <td>{appointment.therapist || '—'}</td>
                  <td>{appointment.service || '—'}</td>
                  <td>{formatDateTime(appointment.datetime)}</td>
                  <td>
                    <StatusBadge status={appointment.status}>
                      {t(`admin.status.${appointment.status}`)}
                    </StatusBadge>
                  </td>
                  <td>
                    <RowActions
                      label={t('center.actions')}
                      items={[
                        {
                          label: t('admin.actions.view'),
                          icon: faEye,
                          onSelect: () => setViewTarget(appointment),
                        },
                        {
                          label: t('admin.actions.edit'),
                          icon: faPen,
                          onSelect: () => setEditTarget(appointment),
                        },
                        {
                          label: t('admin.actions.delete'),
                          icon: faTrashCan,
                          danger: true,
                          onSelect: () => setDeleteTarget(appointment),
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
            totalLabel={t('admin.appointments.total', {
              total: number.format(data?.total ?? 0),
            })}
            onChange={(page) => update({ page })}
            onPageSizeChange={(value) => update({ pageSize: Number(value) })}
          />
        </QueryState>
      </div>

      {viewTarget && (
        <RecordDialog
          title={`${t('admin.appointments.id')} ${viewTarget.id}`}
          onClose={() => setViewTarget(null)}
          rows={[
            { label: t('admin.appointments.id'), value: viewTarget.id },
            { label: t('admin.appointments.patient'), value: viewTarget.patient },
            { label: t('admin.appointments.center'), value: viewTarget.center },
            { label: t('admin.appointments.therapist'), value: viewTarget.therapist },
            { label: t('admin.appointments.service'), value: viewTarget.service },
            {
              label: t('admin.records.dateTime'),
              value: formatDateTime(viewTarget.datetime),
            },
            {
              label: t('admin.records.status'),
              value: t(`admin.status.${viewTarget.status}`),
            },
          ]}
        />
      )}

      {editTarget && (
        <AppointmentEditDialog
          appointment={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            setNotice({ error: false, text: t('admin.actions.updated') });
            state.reload();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          danger
          title={t('admin.actions.deleteTitle', { name: deleteTarget.id })}
          description={t('admin.actions.deleteAppointmentBody')}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await callAdmin('deleteAdminAppointment', { id: deleteTarget.id });
            setNotice({ error: false, text: t('admin.actions.deleted') });
            state.reload();
          }}
        />
      )}

      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            setNotice({ error: false, text: t('admin.appointments.created') });
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminAppointments;
