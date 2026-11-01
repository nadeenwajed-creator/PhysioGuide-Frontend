import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faPlus, faSearch, faStar } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import { Feedback } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue, errorText } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import './ListPages.css';

const therapistStatuses = ['active', 'pending', 'inactive'];

function AddTherapistModal({ centers, onClose, onAdded }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    PhoneNumber: "",
    licenseId: "",
    Password: "",
    specialty: "",
    centerId: "",
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('addAdminPhysiotherapist', form);
      onAdded();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  const centerOptions = [
    { value: '', label: t('admin.allCenters') },
    ...(centers || []).map((center) => ({ value: center.id, label: center.name })),
  ];

  return (
    <Modal
      isOpen
      title={t("admin.therapists.form.title")}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {t("center.cancel")}
          </Button>
          <Button type="submit" form="add-therapist-form" loading={saving}>
            {t("admin.therapists.add")}
          </Button>
        </>
      }
    >
      <form
        id="add-therapist-form"
        className="admin-form"
        onSubmit={submit}
        noValidate
      >
        <FormField
          label={t("admin.therapists.form.name")}
          required
          value={form.fullName}
          onChange={(value) => set("fullName", value)}
          disabled={saving}
          autoComplete="name"
        />
        <FormField
          label={t("admin.therapists.form.email")}
          type="email"
          required
          value={form.email}
          onChange={(value) => set("email", value)}
          disabled={saving}
          autoComplete="email"
        />
        <FormField
          label={t("admin.therapists.form.phoneNumber")}
          required
          value={form.PhoneNumber}
          onChange={(value) => set("PhoneNumber", value)}
          disabled={saving}
        />
        <FormField
          label={t("admin.therapists.form.license")}
          required
          value={form.licenseId}
          onChange={(value) => set("licenseId", value)}
          disabled={saving}
        />
        <FormField
          label={t("admin.therapists.form.password")}
          type="password"
          required
          value={form.Password}
          onChange={(value) => set("Password", value)}
          disabled={saving}
        />
        <FormField
          label={t("admin.therapists.form.specialty")}
          required
          value={form.specialty}
          onChange={(value) => set("specialty", value)}
          disabled={saving}
        />
        <FormField
          label={t("admin.therapists.form.center")}
          as="select"
          required
          value={form.centerId}
          onChange={(value) => set("centerId", value)}
          options={centerOptions}
          disabled={saving}
        />
        <Feedback error>{error}</Feedback>
      </form>
    </Modal>
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
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState(null);

  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminPhysiotherapists', { ...filters, search });

  const data = state.data;
  const options = data?.filters ?? { specialties: [], centers: [] };
  const number = new Intl.NumberFormat(language);

  async function changeStatus(id, status) {
    setSavingId(id);
    setNotice(null);
    try {
      await callAdmin('setAdminPhysiotherapistStatus', { id, status });
      state.reload();
    } catch (failure) {
      setNotice({ error: true, text: errorText(t, failure) });
    } finally {
      setSavingId(null);
    }
  }

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
          {options.specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={filters.center}
          onChange={(e) => update({ center: e.target.value })}
          aria-label={t('admin.allCenters')}
        >
          <option value="">{t('admin.allCenters')}</option>
          {options.centers.map((center) => (
            <option key={center.id} value={center.id}>
              {center.name}
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
          {therapistStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`admin.status.${status}`)}
            </option>
          ))}
        </select>
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
                    <div className="admin-table__person">
                      <Avatar
                        src={therapist.imageUrl}
                        name={therapist.name}
                        size="sm"
                      />
                      <div className="admin-table__primary">
                        <strong>{therapist.name}</strong>
                        <span>{therapist.license || therapist.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>{therapist.specialty || '—'}</td>
                  <td>{therapist.center || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <FontAwesomeIcon icon={faStar} style={{ color: '#f59e0b' }} />
                      {therapist.rating ?? '—'}
                      {therapist.reviews ? ` (${therapist.reviews})` : ''}
                    </span>
                  </td>
                  <td>
                    <select
                      className={`admin-badge admin-badge--${therapist.status}`}
                      value={therapist.status}
                      aria-label={t('center.status')}
                      disabled={savingId === therapist.id}
                      onChange={(e) => changeStatus(therapist.id, e.target.value)}
                    >
                      {therapistStatuses.map((status) => (
                        <option key={status} value={status}>
                          {t(`admin.status.${status}`)}
                        </option>
                      ))}
                    </select>
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
            setNotice({ error: false, text: t('admin.therapists.added') });
            state.reload();
          }}
        />
      )}
    </div>
  );
}

export default AdminPhysiotherapists;
