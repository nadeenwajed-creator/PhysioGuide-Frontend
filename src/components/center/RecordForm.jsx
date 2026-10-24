import { useEffect, useState } from 'react';
import Modal from '../shared/Modal/Modal.jsx';
import Button from '../shared/Button/Button.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { Feedback, SelectField } from './CenterUI.jsx';
import Avatar from '../shared/Avatar/Avatar.jsx';
import useCenter from './useCenter.js';
import { saveCenterPatient } from '../../services/patientService.js';
import { saveCenterTherapist } from '../../services/therapistService.js';
import { saveCenterService } from '../../services/serviceService.js';
import { saveCenterAppointment } from '../../services/appointmentService.js';
import { prepareCenterImage } from '../../services/centerPortalService.js';
const saveMethods = {
  patient: saveCenterPatient,
  therapist: saveCenterTherapist,
  service: saveCenterService,
  appointment: saveCenterAppointment
};

function RecordForm({
  kind,
  record,
  onClose
}) {
  const {
    data,
    actor,
    tr,
    name,
    dir,
    notify
  } = useCenter();
  const professionalOnly = kind === 'therapist' && Boolean(record?.id);
  const [values, setValues] = useState(() => ({
    name: record?.name?.en || '',
    nameAr: record?.name?.ar || '',
    email: record?.email || '',
    phone: record?.phone || '',
    birthDate: record?.birthDate || '',
    gender: record?.gender || 'unspecified',
    status: record?.status || 'active',
    specialty: record?.specialty?.en || '',
    specialtyAr: record?.specialty?.ar || '',
    experience: record?.experience ?? '0',
    price: record?.price ?? '25',
    duration: record?.duration ?? '45',
    availability: record?.availability || 'available',
    description: record?.description?.en || '',
    descriptionAr: record?.description?.ar || '',
    imageUrl: record?.imageUrl || '',
    patientId: record?.patientId || '',
    therapistId: record?.therapistId || '',
    serviceId: record?.serviceId || '',
    date: record?.date || data.today,
    time: record?.time || '09:00',
    note: record?.note || ''
  }));
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  useEffect(() => {
    // Focus after React has rendered errors and re-enabled the controls.
    const firstInvalid = Object.keys(fields)[0];
    if (!busy && firstInvalid) document.getElementById(`record-${firstInvalid}`)?.focus();
  }, [busy, fields]);
  const set = (key, value) => setValues(current => ({
    ...current,
    [key]: value
  }));
  const field = (key, options = {}) => <FormField
    key={key}
    id={`record-${key}`}
    label={tr(key)}
    value={values[key]}
    onChange={value => set(key, value)}
    error={fields[key] ? tr(`error.${fields[key]}`) : undefined}
    disabled={busy}
    {...options}
  />;
  const select = (key, options) => <SelectField
    key={key}
    id={`record-${key}`}
    label={tr(key)}
    value={values[key]}
    onChange={value => set(key, value)}
    options={options}
    required={['patientId', 'therapistId', 'serviceId'].includes(key)}
    disabled={busy}
    error={fields[key] ? tr(`error.${fields[key]}`) : undefined}
  />;
  const choices = list => [{
    value: '',
    label: tr('select')
  }, ...list.map(item => ({
    value: item.id,
    label: name(item.name)
  }))];
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      const keys = professionalOnly
        ? ['specialty', 'specialtyAr', 'experience', 'availability']
        : ['name', 'nameAr', 'email', 'phone', 'specialty', 'specialtyAr', 'experience', 'availability', 'imageUrl'];
      const submitted = kind === 'therapist'
        ? Object.fromEntries(keys.map(key => [key, values[key]]))
        : { ...values };
      if (imageFile) submitted.imageUrl = await prepareCenterImage(imageFile);
      await saveMethods[kind](actor, submitted, record?.id);
      notify(tr('saved'));
      onClose();
    } catch (failure) {
      setFields(failure.fields || {});
      setError(tr(`error.${failure.code || 'network'}`));
    } finally {
      setBusy(false);
    }
  }
  return <Modal className="center-modal" isOpen title={tr(`${record ? 'edit' : 'add'}.${kind}`)} dir={dir} size="lg" onClose={busy ? undefined : onClose} footer={<>
      <Button variant="outline" onClick={onClose} disabled={busy}>{tr('cancel')}</Button>
      <Button type="submit" form="center-record-form" loading={busy}>{tr('save')}</Button>
    </>}>
    <form id="center-record-form" onSubmit={submit} noValidate>
      {professionalOnly && <div className="center-record-summary">
        <Avatar src={record.imageUrl} name={name(record.name)} size="md" />
        <strong>{name(record.name)}</strong>
      </div>}
      <p className="center-form-help">{tr('requiredFields')}</p>
      <div className="center-form-grid">
        {kind === 'appointment' ? <>
          {select('patientId', choices(data.patients.filter(item => item.status === 'active')))}
          {select('therapistId', choices(data.therapists.filter(item => item.availability === 'available')))}
          {select('serviceId', choices(data.services.filter(item => item.status === 'active')))}
          {field('date', {
            type: 'date',
            required: true
          })}
          {field('time', {
            type: 'time',
            required: true
          })}
          {field('note', {
            as: 'textarea',
            rows: 3
          })}
        </> : <>
          {!professionalOnly && <>{field('name', {
            required: true
          })}
          {field('nameAr', {
            dir: 'rtl'
          })}</>}
          {kind !== 'service' && !professionalOnly && <>
            {field('email', {
              type: 'email',
              required: true,
              dir: 'ltr'
            })}
            {field('phone', {
              type: 'tel',
              required: true,
              dir: 'ltr'
            })}
          </>}
          {kind === 'patient' && <>
            {field('birthDate', {
              type: 'date'
            })}
            {select('gender', ['unspecified', 'male', 'female'].map(value => ({
              value,
              label: tr(value)
            })))}
            {select('status', ['active', 'inactive'].map(value => ({
              value,
              label: tr(value)
            })))}
          </>}
          {kind === 'therapist' && <>
            {field('specialty', {
              required: true
            })}
            {field('specialtyAr', {
              dir: 'rtl'
            })}
            {field('experience', {
              type: 'number',
              required: true
            })}
            {select('availability', ['available', 'unavailable'].map(value => ({
              value,
              label: tr(value)
            })))}
          </>}
          {kind === 'service' && <>
            {field('price', {
              label: tr('servicePrice'),
              type: 'number',
              required: true
            })}
            {field('duration', {
              type: 'number',
              required: true
            })}
            {field('description', {
              as: 'textarea',
              required: true,
              rows: 3
            })}
            {field('descriptionAr', {
              as: 'textarea',
              dir: 'rtl',
              rows: 3
            })}
          </>}
          {!professionalOnly && <>{select('imageUrl', [{
            value: '',
            label: tr('noImage')
          }, ...(kind === 'service' ? data.serviceImageOptions : data.portraitOptions).map((value, index) => ({
            value,
            label: tr('sampleImage', {
              count: index + 1
            })
          }))])}
          <label className="center-upload">
            {tr('uploadImage')}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => setImageFile(event.target.files?.[0] || null)} />
            <small>{tr('imageHelp')}</small>
          </label>
          </>}
        </>}
      </div>
      <Feedback error>{error}</Feedback>
    </form>
  </Modal>;
}
export default RecordForm;
