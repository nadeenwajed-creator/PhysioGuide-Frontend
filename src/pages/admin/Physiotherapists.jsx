import { useState } from 'react';
import { faEye, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import { ConfirmDialog, Feedback } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue, errorText } from './useAdminQuery.js';
import { QueryState, AdminPagination, RecordDialog } from './AdminUI.jsx';
import RowActions from './RowActions.jsx';
import { TherapistEditDialog } from './AdminRecordDialogs.jsx';
import './ListPages.css';

// Therapists carry the account's IsActive flag only, so the two statuses the
// API can filter and store are Active and Suspended.
const therapistStatuses = ['active', 'suspended'];

function AddTherapistModal({ centers, specialties, onClose, onAdded }) {
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

  // The form sends the specialty id; the server resolves it against the
  // specialty catalog it already uses for the list filter.
  const specialtyOptions = [
    { value: '', label: '—' },
    ...(specialties || []).map((specialty) => ({
      value: specialty.id,
      label: specialty.name,
    })),
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
          as="select"
          required
          value={form.specialty}
          onChange={(value) => set("specialty", value)}
          options={specialtyOptions}
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
  const [viewTarget, setViewTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
                value: specialty.id,
                label: specialty.name,
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

        <QueryState state={state} empty={!data?.items?.length}>
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
                    <RowActions
                      label={t('center.actions')}
                      items={[
                        {
                          label: t('admin.actions.view'),
                          icon: faEye,
                          onSelect: () => setViewTarget(therapist),
                        },
                        {
                          label: t('admin.actions.edit'),
                          icon: faPen,
                          onSelect: () => setEditId(therapist.id),
                        },
                        {
                          label: t('admin.actions.delete'),
                          icon: faTrashCan,
                          danger: true,
                          onSelect: () => setDeleteTarget(therapist),
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
            totalLabel={t('admin.therapists.total', {
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
          rows={[
            { label: t('admin.records.id'), value: viewTarget.id },
            { label: t('admin.therapists.name'), value: viewTarget.name },
            { label: t('admin.records.email'), value: viewTarget.email },
            { label: t('admin.records.specialty'), value: viewTarget.specialty },
            { label: t('admin.records.center'), value: viewTarget.center },
            { label: t('admin.records.rating'), value: viewTarget.rating },
            { label: t('admin.records.status'), value: t(`admin.status.${viewTarget.status}`) },
          ]}
        />
      )}

      {editId && (
        <TherapistEditDialog
          id={editId}
          centers={options.centers}
          specialties={options.specialties}
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
          description={t('admin.actions.deleteTherapistBody')}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await callAdmin('deleteAdminPhysiotherapist', { id: deleteTarget.id });
            setNotice({ error: false, text: t('admin.actions.deleted') });
            state.reload();
          }}
        />
      )}

      {showAdd && (
        <AddTherapistModal
          centers={options.centers}
          specialties={options.specialties}
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
