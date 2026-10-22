import { useState } from 'react';
import Modal from '../shared/Modal/Modal.jsx';
import Avatar from '../shared/Avatar/Avatar.jsx';
import Button from '../shared/Button/Button.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { EmptyState, RecordStatus, Feedback } from './CenterUI.jsx';
import useCenter from './useCenter.js';
import { addPatientNote } from '../../services/patientService.js';
import { formatDate } from '../../utils/centerFormat.js';
import { getPatientAppointmentSummary } from '../../services/patientSummaryService.js';
import './PatientDetails.css';
function PatientDetails({
  patient,
  onClose,
  onEdit
}) {
  const {
    data,
    actor,
    tr,
    name,
    language,
    dir
  } = useCenter();
  const [tab, setTab] = useState('overview');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { history, total, lastVisit } = getPatientAppointmentSummary(data.appointments, patient.id);
  async function saveNote(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addPatientNote(actor, patient.id, note);
      setNote('');
    } catch (failure) {
      setError(tr(`error.${failure.code || 'network'}`));
    } finally {
      setBusy(false);
    }
  }
  return <Modal className="center-modal" isOpen size="lg" title={tr('patientDetails')} dir={dir} onClose={onClose} footer={<>
      <Button variant="outline" onClick={onClose}>{tr('close')}</Button>
      <Button onClick={onEdit}>{tr('edit.patient')}</Button>
    </>}>
    <div className="center-identity center-patient-details__identity">
      <Avatar src={patient.imageUrl} name={name(patient.name)} size="lg" />
      <div>
        <h3>{name(patient.name)}</h3>
        <p><bdi>{patient.phone}</bdi></p>
        <p><bdi>{patient.email}</bdi></p>
      </div>
    </div>
    <div className="center-tabs" aria-label={tr('patientDetails')}>{['overview', 'appointments', 'medicalNotes'].map(key => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{tr(key)}</button>)}</div>
    {tab === 'overview' && <dl className="center-detail-list center-patient-details__summary">
      <div>
        <dt>{tr('birthDate')}</dt>
        <dd>{formatDate(patient.birthDate, language)}</dd>
      </div>
      <div>
        <dt>{tr('gender')}</dt>
        <dd>{tr(patient.gender)}</dd>
      </div>
      <div>
        <dt>{tr('status')}</dt>
        <dd><RecordStatus value={patient.status} /></dd>
      </div>
    </dl>}
    {tab === 'overview' && <dl className="center-detail-list center-patient-details__visits">
      <div><dt>{tr('totalAppointments')}</dt><dd>{new Intl.NumberFormat(language).format(total)}</dd></div>
      <div><dt>{tr('lastVisit')}</dt><dd>{lastVisit ? formatDate(lastVisit.date, language) : tr('noPreviousVisits')}</dd></div>
    </dl>}
    {tab === 'appointments' && <div className="center-patient-details__history">
      <h3>{tr('appointmentHistory')}</h3>
      {history.length ? history.map(item => <article key={item.id}>
        <div>
          <time>{formatDate(item.date, language)} · <bdi>{item.time}</bdi></time>
          <strong>{name(data.services.find(service => service.id === item.serviceId)?.name)}</strong>
          <small>{name(data.therapists.find(therapist => therapist.id === item.therapistId)?.name)}</small>
        </div>
        <RecordStatus value={item.status} />
      </article>) : <EmptyState>{tr('noAppointments')}</EmptyState>}
    </div>}
    {tab === 'medicalNotes' && <>
      {patient.notes.length ? patient.notes.map(item => <article className="center-patient-details__note" key={item.id}>
        <time>{formatDate(item.date, language)}</time>
        <p dir="auto">{item.text}</p>
      </article>) : <EmptyState>{tr('noNotes')}</EmptyState>}
      <form onSubmit={saveNote}>
        <FormField label={tr('newNote')} as="textarea" rows={3} value={note} onChange={setNote} required disabled={busy} />
        <Feedback error>{error}</Feedback>
        <Button type="submit" loading={busy}>{tr('saveNote')}</Button>
      </form>
    </>}
  </Modal>;
}
export default PatientDetails;
