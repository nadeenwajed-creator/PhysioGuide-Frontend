import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faPlus, faSearch, faStar, faTimes } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue, useStatusOverride } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import './ListPages.css';

function StatusMenu({ therapistId, current, onChanged }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const statuses = ['active', 'pending', 'inactive'].filter((s) => s !== current);

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
                onChanged(therapistId, status);
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

function AddTherapistModal({ centers, onClose, onAdded }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    licenseId: '',
    specialty: '',
    centerId: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('addAdminPhysiotherapist', form);
      onAdded();
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
          <h2>{t('admin.therapists.add')}</h2>
          <button className="admin-icon-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={submit} className="admin-modal__form">
          <label>
            {t('admin.therapists.name')}
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </label>
          <label>
            License ID
            <input
              value={form.licenseId}
              onChange={(e) => set('licenseId', e.target.value)}
              required
            />
          </label>
          <label>
            {t('admin.therapists.specialty')}
            <input
              value={form.specialty}
              onChange={(e) => set('specialty', e.target.value)}
              required
            />
          </label>
          <label>
            {t('admin.therapists.center')}
            <select
              value={form.centerId}
              onChange={(e) => set('centerId', e.target.value)}
              required
            >
              <option value="">{t('admin.allCenters')}</option>
              {(centers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="admin-modal__error">{error}</p>}
          <div className="admin-modal__actions">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('center.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('admin.state.loading') : t('admin.therapists.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminPhysiotherapists() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    specialty: '',
    center: '',
    status: '',
    page: 1,
    pageSize: 5,
  });
  const [showAdd, setShowAdd] = useState(false);

  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminPhysiotherapists', { ...filters, search });

  const { begin, revert, reconcile } = useStatusOverride();
  const data = state.data;
  const options = data?.filters ?? { specialties: [], centers: [] };
  const number = new Intl.NumberFormat(language);

  if (data?.items) reconcile(data.items);

  const changeStatus = async (id, status) => {
    begin(id, status);
    try {
      await callAdmin('setAdminPhysiotherapistStatus', { id, status });
      state.reload();
    } catch {
      revert(id);
    }
  };

  return (
    <div className="admin-list-page">
      <header
        className="admin-list-page__header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1>{t('admin.therapists.title')}</h1>
          <p>{t('admin.therapists.subtitle')}</p>
        </div>
        <Button icon={faPlus} onClick={() => setShowAdd(true)}>
          {t('admin.therapists.add')}
        </Button>
      </header>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={t('admin.therapists.search')}
          />
        </div>
        <select
          className="admin-select"
          value={filters.specialty}
          onChange={(e) => update({ specialty: e.target.value })}
          aria-label={t('admin.allSpecialties')}
        >
          <option value="">{t('admin.allSpecialties')}</option>
          {options.specialties.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
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
        <select
          className="admin-select"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label={t('admin.allStatuses')}
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="active">{t('admin.status.active')}</option>
          <option value="pending">{t('admin.status.pending')}</option>
          <option value="inactive">{t('admin.status.inactive')}</option>
        </select>
      </div>

      <QueryState state={state} empty={!data?.items?.length}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.therapists.name')}</th>
                <th>{t('admin.therapists.specialty')}</th>
                <th>{t('admin.therapists.center')}</th>
                <th>{t('admin.therapists.rating')}</th>
                <th>{t('center.status')}</th>
                <th>{t('center.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((therapist) => (
                <tr key={therapist.id}>
                  <td>
                    <div className="admin-table__primary">
                      <strong>{therapist.name}</strong>
                      <span>{therapist.license || therapist.id}</span>
                    </div>
                  </td>
                  <td>{therapist.specialty}</td>
                  <td>{therapist.center}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <FontAwesomeIcon icon={faStar} style={{ color: '#f59e0b' }} />
                      {therapist.rating ?? '—'}{' '}
                      {therapist.reviews != null && `(${therapist.reviews})`}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge--${therapist.status}`}>
                      {t(`admin.status.${therapist.status}`)}
                    </span>
                  </td>
                  <td>
                    <StatusMenu
                      therapistId={therapist.id}
                      current={therapist.status}
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
            totalLabel={t('admin.therapists.total', {
              total: number.format(data?.total ?? 0),
            })}
            onChange={(page) => update({ page })}
          />
        </div>
      </QueryState>

      {showAdd && (
        <AddTherapistModal
          centers={options.centers}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminPhysiotherapists;
