import { useState } from 'react';
import Button from '../../components/shared/Button/Button.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import { Feedback } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { errorText } from './useAdminQuery.js';
import { QueryState } from './AdminUI.jsx';

// Every dialog is the same shell: a form that saves through callAdmin and
// reports the failure inline instead of closing on error.
function EditDialog({ title, formId, saving, error, onClose, onSubmit, children }) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen
      title={title}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {t('center.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {t('admin.settingsPage.saveChanges')}
          </Button>
        </>
      }
    >
      <form id={formId} className="admin-form" onSubmit={onSubmit} noValidate>
        {children}
        <Feedback error>{error}</Feedback>
      </form>
    </Modal>
  );
}

const pad = (value) => String(value).padStart(2, '0');
const datePart = (value) => (value ? String(value).slice(0, 10) : '');
const timePart = (value) => (value ? String(value).slice(11, 16) : '');

// The API reads and writes local wall-clock values without a zone, so the
// parts are assembled by hand rather than through a UTC conversion.
function toApiDateTime(date, time, minutesToAdd = 0) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + minutesToAdd * 60000);
  const format = (value) =>
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
  return { start: format(start), end: format(end) };
}

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const from = new Date(`${datePart(start)}T${timePart(start)}:00`);
  const to = new Date(`${datePart(end)}T${timePart(end)}:00`);
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

export function PatientEditDialog({ id, onClose, onSaved }) {
  const { t } = useLanguage();
  const state = useAdminQuery('getAdminPatient', { id });
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const patient = state.data;
  const form = draft ?? {
    name: patient?.name ?? '',
    phone: patient?.phone ?? '',
    city: patient?.city ?? '',
    gender: patient?.gender ?? '',
    dateOfBirth: patient?.dateOfBirth ?? '',
  };
  const set = (key, value) => setDraft({ ...form, [key]: value });

  // A stored value outside the two known genders is kept selectable.
  const genderOptions = [
    { value: '', label: '—' },
    { value: 'male', label: t('admin.records.genderMale') },
    { value: 'female', label: t('admin.records.genderFemale') },
    ...(form.gender && !['male', 'female'].includes(form.gender)
      ? [{ value: form.gender, label: form.gender }]
      : []),
  ];

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('updateAdminPatient', {
        id,
        fullName: form.name,
        phoneNumber: form.phone,
        city: form.city,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
      });
      onSaved();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditDialog
      title={t('admin.records.editPatient')}
      formId="edit-patient-form"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <QueryState state={state}>
        <FormField
          label={t('admin.patients.patient')}
          required
          value={form.name}
          onChange={(value) => set('name', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.phone')}
          value={form.phone}
          onChange={(value) => set('phone', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.city')}
          value={form.city}
          onChange={(value) => set('city', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.gender')}
          as="select"
          value={form.gender}
          onChange={(value) => set('gender', value)}
          options={genderOptions}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.dateOfBirth')}
          type="date"
          value={form.dateOfBirth}
          onChange={(value) => set('dateOfBirth', value)}
          disabled={saving}
        />
      </QueryState>
    </EditDialog>
  );
}

export function TherapistEditDialog({ id, centers = [], specialties = [], onClose, onSaved }) {
  const { t } = useLanguage();
  const state = useAdminQuery('getAdminPhysiotherapist', { id });
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const therapist = state.data;
  const form = draft ?? {
    name: therapist?.name ?? '',
    phone: therapist?.phone ?? '',
    centerId: therapist?.centerId ?? '',
    specialtyId: therapist?.specialtyId ?? '',
    yearsOfExperience: therapist?.yearsOfExperience ?? '',
    bio: therapist?.bio ?? '',
    isAvailable: therapist?.isAvailable !== false,
  };
  const set = (key, value) => setDraft({ ...form, [key]: value });

  const withPlaceholder = (items) => [
    { value: '', label: '—' },
    ...items.map((item) => ({ value: item.id, label: item.name })),
  ];

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('updateAdminPhysiotherapist', {
        id,
        fullName: form.name,
        phoneNumber: form.phone,
        centerId: form.centerId,
        specialtyId: form.specialtyId,
        yearsOfExperience: form.yearsOfExperience,
        bio: form.bio,
        isAvailable: form.isAvailable,
      });
      onSaved();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditDialog
      title={t('admin.records.editTherapist')}
      formId="edit-therapist-form"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <QueryState state={state}>
        <FormField
          label={t('admin.therapists.name')}
          required
          value={form.name}
          onChange={(value) => set('name', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.phone')}
          value={form.phone}
          onChange={(value) => set('phone', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.center')}
          as="select"
          value={form.centerId}
          onChange={(value) => set('centerId', value)}
          options={withPlaceholder(centers)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.specialty')}
          as="select"
          value={form.specialtyId}
          onChange={(value) => set('specialtyId', value)}
          options={withPlaceholder(specialties)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.years')}
          type="number"
          value={form.yearsOfExperience}
          onChange={(value) => set('yearsOfExperience', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.bio')}
          as="textarea"
          value={form.bio}
          onChange={(value) => set('bio', value)}
          disabled={saving}
        />
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.isAvailable}
            disabled={saving}
            onChange={(event) => set('isAvailable', event.target.checked)}
          />
          <span>{t('admin.records.available')}</span>
        </label>
      </QueryState>
    </EditDialog>
  );
}

export function AppointmentEditDialog({ appointment, onClose, onSaved }) {
  const { t } = useLanguage();
  const optionsState = useAdminQuery('getAdminAppointmentOptions');
  const options = optionsState.data;
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const form = draft ?? {
    date: datePart(appointment?.datetime),
    time: timePart(appointment?.datetime) || '09:00',
    centerId: '',
    therapistId: '',
    serviceId: '',
    status: appointment?.status ?? 'pending',
    notes: '',
  };
  const set = (key, value) => setDraft({ ...form, [key]: value });

  const allTherapists = options?.therapists || [];
  const therapists = allTherapists.filter(
    (therapist) => !form.centerId || therapist.centerId === form.centerId
  );

  // The service select follows the chosen therapist: only the services that
  // therapist provides at that centre are listed. A therapist with no service
  // mapping keeps the centre's full list instead of an empty dropdown.
  const centerServices = (options?.services || []).filter(
    (service) => !form.centerId || service.centerId === form.centerId
  );
  const selectedTherapist = allTherapists.find((item) => item.id === form.therapistId);
  const offeredServices = selectedTherapist?.serviceIds ?? [];
  const services = offeredServices.length
    ? centerServices.filter((service) => offeredServices.includes(service.id))
    : centerServices;

  // Picking another therapist drops a service they do not provide.
  const changeTherapist = (value) => {
    const therapist = allTherapists.find((item) => item.id === value);
    const offered = therapist?.serviceIds ?? [];
    setDraft({
      ...form,
      therapistId: value,
      serviceId: !offered.length || offered.includes(form.serviceId) ? form.serviceId : '',
    });
  };
  const toOptions = (items) => [
    { value: '', label: '—' },
    ...items.map((item) => ({ value: item.id, label: item.name })),
  ];

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const service = (options?.services || []).find((item) => item.id === form.serviceId);
      const minutes =
        Number(service?.duration) ||
        minutesBetween(appointment?.datetime, appointment?.endDateTime) ||
        30;
      const { start, end } = toApiDateTime(form.date, form.time, minutes);

      await callAdmin('updateAdminAppointment', {
        id: appointment.id,
        centerId: form.centerId,
        therapistId: form.therapistId,
        serviceId: form.serviceId,
        startDateTime: start,
        endDateTime: end,
        status: form.status,
        patientNotes: form.notes,
      });
      onSaved();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditDialog
      title={t('admin.records.editAppointment')}
      formId="edit-appointment-form"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <QueryState state={optionsState}>
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
        <FormField
          label={t('admin.appointments.form.center')}
          as="select"
          value={form.centerId}
          onChange={(value) => {
            setDraft({ ...form, centerId: value, therapistId: '', serviceId: '' });
          }}
          options={toOptions(options?.centers || [])}
          disabled={saving}
        />
        <FormField
          label={t('admin.appointments.form.therapist')}
          as="select"
          value={form.therapistId}
          onChange={changeTherapist}
          options={toOptions(therapists)}
          disabled={saving}
        />
        <FormField
          label={t('admin.appointments.form.service')}
          as="select"
          value={form.serviceId}
          onChange={(value) => set('serviceId', value)}
          options={toOptions(services)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.status')}
          as="select"
          value={form.status}
          onChange={(value) => set('status', value)}
          options={['pending', 'confirmed', 'approved', 'completed', 'cancelled', 'rejected'].map(
            (status) => ({ value: status, label: t(`admin.status.${status}`) })
          )}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.notes')}
          as="textarea"
          value={form.notes}
          onChange={(value) => set('notes', value)}
          disabled={saving}
        />
      </QueryState>
    </EditDialog>
  );
}

export function CenterEditDialog({ id, onClose, onSaved }) {
  const { t } = useLanguage();
  const state = useAdminQuery('getAdminCenter', { id });
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const center = state.data;
  const form = draft ?? {
    nameEnglish: center?.nameEnglish ?? '',
    nameArabic: center?.nameArabic ?? center?.name ?? '',
    city: center?.city ?? '',
    address: center?.address ?? '',
    websiteUrl: center?.websiteUrl ?? '',
    phoneNumber: center?.phone ?? '',
  };
  const set = (key, value) => setDraft({ ...form, [key]: value });

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callAdmin('updateAdminCenter', { id, ...form });
      onSaved();
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditDialog
      title={t('admin.records.editCenter')}
      formId="edit-center-form"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <QueryState state={state}>
        <FormField
          label={t('admin.records.nameEnglish')}
          value={form.nameEnglish}
          onChange={(value) => set('nameEnglish', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.nameArabic')}
          required
          value={form.nameArabic}
          onChange={(value) => set('nameArabic', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.city')}
          value={form.city}
          onChange={(value) => set('city', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.address')}
          value={form.address}
          onChange={(value) => set('address', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.phone')}
          value={form.phoneNumber}
          onChange={(value) => set('phoneNumber', value)}
          disabled={saving}
        />
        <FormField
          label={t('admin.records.website')}
          value={form.websiteUrl}
          onChange={(value) => set('websiteUrl', value)}
          disabled={saving}
        />
      </QueryState>
    </EditDialog>
  );
}
