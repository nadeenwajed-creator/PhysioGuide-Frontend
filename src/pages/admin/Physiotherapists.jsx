import { useState } from 'react';
import { faEllipsisV, faPlus } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
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
    pageSize: 10,
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
      <header className="admin-list-page__header admin-list-page__header--actions">
        <div>
          <h1>{t('admin.therapists.title')}</h1>
          <p>{t('admin.therapists.subtitle')}</p>
        </div>
        <Button icon={faPlus} onClick={() => setShowAdd(true)}>
          {t('admin.therapists.add')}
        </Button>
      </header>

      <div className="admin-list-page__filters">
        <SearchBar
          value={filters.search}
          onChange={(value) => update({ search: value })}
          placeholder={t('admin.therapists.search')}
          ariaLabel={t('admin.therapists.search')}
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
        <FilterSelect
          value={filters.status}
          onChange={(value) => update({ status: value })}
          ariaLabel={t('admin.allStatuses')}
          options={[
            { value: '', label: t('admin.allStatuses') },
            ...therapistStatuses.map((status) => ({
              value: status,
              label: t(`admin.status.${status}`),
            })),
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
                        email={therapist.email}
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
                    <span className="admin-table__rating">
                      <RatingStars rating={therapist.rating ?? 0} />
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
            totalLabel={t('admin.therapists.total', {
              total: number.format(data?.total ?? 0),
            })}
            onChange={(page) => update({ page })}
            onPageSizeChange={(value) => update({ pageSize: Number(value) })}
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
