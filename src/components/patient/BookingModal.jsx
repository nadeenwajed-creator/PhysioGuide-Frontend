import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal/Modal.jsx';
import Button from '../shared/Button/Button.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { SelectField, Feedback } from '../center/CenterUI.jsx';
import usePatientAvailability from './usePatientAvailability.js';
import { dateKey } from '../../utils/centerFormat.js';
import { requestPatientAppointment } from '../../services/appointmentService.js';
import { usePatientLabels } from './usePatientLabels.js';

function BookingForm({ state, initial, onClose, center }) {
  const { t, name, money } = usePatientLabels();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    centerId: center.id,
    serviceId: initial.serviceId || '',
    therapistId: initial.therapistId || '',
    date: initial.date || '',
    time: initial.time || ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  // Offer available therapists who provide the selected service
  const therapists = center.therapists.filter(p => p.availability === 'available' && (!values.serviceId || (p.serviceIds || []).includes(values.serviceId)));
  const validService = center.services.some(s => s.id === values.serviceId);
  const validTherapist = therapists.some(p => p.id === values.therapistId);
  // Clear a selected time if another booking makes it unavailable
  const reconcileTime = useCallback(slots => setValues(current => current.time && !slots.includes(current.time) ? {
    ...current,
    time: ''
  } : current), []);
  const { slots, loading, error: availabilityError } = usePatientAvailability(state.actor, {
    ...values,
    serviceId: validService ? values.serviceId : '',
    therapistId: validTherapist ? values.therapistId : ''
  }, center, reconcileTime);
  function set(key, value) {
    setError('');
    // Recheck the time after any change, and the therapist after a service change
    setValues(v => ({
      ...v,
      [key]: value,
      time: '',
      ...(key === 'serviceId' ? {
        therapistId: ''
      } : {})
    }));
  }
  async function submit(e) {
    e.preventDefault();
    if (submitting.current) return;
    // Check the latest slots again even if the confirm button was enabled
    if (loading || !validService || !validTherapist || !slots.includes(values.time)) {
      setError(t('choose'));
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      // Open the appointments page only after the request succeeds
      await requestPatientAppointment(state.actor, values);
      navigate('/patient/appointments');
      onClose();
    } catch {
      setError(t('error'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return <Modal
    isOpen
    title={t('book')}
    onClose={busy ? undefined : onClose}
    footer={<>
      <Button variant="outline" onClick={onClose} disabled={busy}>{t('cancel')}</Button>
      <Button
        type="submit"
        form="patient-booking"
        loading={busy}
        disabled={loading || !validService || !validTherapist || !slots.includes(values.time)}
      >
        {t('confirm')}
      </Button>
    </>}
  >
    <form id="patient-booking" onSubmit={submit} className="pd-booking">
      <p>{name(center.name)}</p>
      <p>{t('bookingHelp')}</p>
      <SelectField
        label={t('service')}
        value={values.serviceId}
        onChange={v => set('serviceId', v)}
        options={[{
          value: '',
          label: t('select')
          }, ...center.services.map(s => ({
            value: s.id,
            label: `${name(s.name)} · ${money(s.price)}`
        }))]}
      />
      <SelectField
        label={t('therapist')}
        value={values.therapistId}
        onChange={v => set('therapistId', v)}
        options={[{
          value: '',
          label: t('select')
          }, ...therapists.map(p => ({
            value: p.id,
            label: name(p.name)
        }))]}
      />
      <FormField
        type="date"
        min={dateKey(new Date())}
        label={t('date')}
        value={values.date}
        onChange={v => set('date', v)}
      />
      <SelectField
        label={t('time')}
        value={values.time}
        onChange={time => setValues(v => ({
          ...v,
          time
        }))}
        options={[{
          value: '',
          label: t('select')
          }, ...slots.map(time => ({
            value: time,
            label: time
        }))]}
      />
      {loading && values.date && <p role="status">{t('loading')}</p>}
      {!loading && values.date && !slots.length && <p>{t('noSlots')}</p>}
      <Feedback error>
        {error || availabilityError && t('error')}
      </Feedback>
    </form>
  </Modal>;
}

export default function BookingModal(props) {
  const { t } = usePatientLabels();
  // Handle an old booking link if its center is no longer in the list
  const center = props.state.data?.centers.find(c => c.id === props.initial.centerId);
  return center ? <BookingForm key={center.id} {...props} center={center} /> : <Modal isOpen title={t('book')} onClose={props.onClose}>
    <Feedback error>
      {t('notFound')}
    </Feedback>
  </Modal>;
}
