import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faPlus, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import './ListPages.css';

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

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Narrow therapists by selected center.
  const therapists = (options?.therapists || []).filter(
    (th) => !form.centerId || th.centerId === form.centerId,
  );

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('createAdminAppointment', form);
      onCreated();
    } catch (err) {
      setError(err?.message || t('admin.state.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h2>{t('admin.appointments.new')}</h2>
          <button className="admin-icon-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        {optionsState.loading ? (
          <p className="admin-state" role="status">
            {t('admin.state.loading')}
          </p>
        ) : (
          <form onSubmit={submit} className="admin-modal__form">
            <label>
              {t('admin.appointments.patient')}
              <select
                value={form.patientId}
                onChange={(e) => set('patientId', e.target.value)}
                required
              >
                <option value="">—</option>
                {(options?.patients || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.appointments.center')}
              <select
                value={form.centerId}
                onChange={(e) => {
                  set('centerId', e.target.value);
                  set('therapistId', '');
                }}
                required
              >
                <option value="">—</option>
                {(options?.centers || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.appointments.therapist')}
              <select
                value={form.therapistId}
                onChange={(e) => set('therapistId', e.target.value)}
              >
                <option value="">—</option>
                {therapists.map((th) => (
                  <option key={th.id} value={th.id}>{th.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.appointments.service')}
              <select
                value={form.serviceId}
                onChange={(e) => set('serviceId', e.target.value)}
                required
              >
                <option value="">—</option>
                {(options?.services || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.appointments.date')}
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
              />
            </label>
            <label>
              {t('admin.appointments.time')}
              <input
                type="time"
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
                required
              />
            </label>
            {error && <p className="admin-modal__error">{error}</p>}
            <div className="admin-modal__actions">
              <Button variant="outline" type="button" onClick={onClose}>
                {t('center.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('admin.state.loading') : t('admin.appointments.new')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminAppointments() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    center: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 5,
  });
  const [showNew, setShowNew] = useState(false);

  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminAppointments', { ...filters, search });

  const data = state.data;
  const options = data?.filters ?? { centers: [] };
  const number = new Intl.NumberFormat(language);

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="admin-list-page">
      <header
        className="admin-list-page__header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>{t('admin.appointments.title')}</h1>
          <p>{t('admin.appointments.subtitle')}</p>
        </div>
        <Button icon={faPlus} onClick={() => setShowNew(true)}>
          {t('admin.appointments.new')}
        </Button>
      </header>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={t('admin.appointments.search')}
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
          <option value="confirmed">{t('admin.status.confirmed')}</option>
          <option value="completed">{t('admin.status.completed')}</option>
          <option value="cancelled">{t('admin.status.cancelled')}</option>
        </select>
        <select
          className="admin-select"
          value={filters.center}
          onChange={(e) => update({ center: e.target.value })}
          aria-label={t('admin.allCenters')}
        >
          <option value="">{t('admin.allCenters')}</option>
          {(options.centers || []).map((c) => (
            <option key={c.id ?? c} value={c.id ?? c}>
              {c.name ?? c}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="admin-select"
          value={filters.from}
          onChange={(e) => update({ from: e.target.value })}
          aria-label={t('admin.appointments.dateRange')}
          style={{ padding: '10px 12px' }}
        />
        <input
          type="date"
          className="admin-select"
          value={filters.to}
          onChange={(e) => update({ to: e.target.value })}
          aria-label="To date"
          style={{ padding: '10px 12px' }}
        />
      </div>

      <QueryState state={state} empty={!data?.items?.length}>
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
              {data?.items?.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.id}</strong>
                  </td>
                  <td>{a.patient}</td>
                  <td>{a.center}</td>
                  <td>{a.therapist}</td>
                  <td>{a.service}</td>
                  <td>{formatDateTime(a.datetime)}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${a.status}`}>
                      {t(`admin.status.${a.status}`)}
                    </span>
                  </td>
                  <td>
                    <button className="admin-icon-button" aria-label={t('center.actions')}>
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </button>
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
          />
        </div>
      </QueryState>

      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminAppointments;
