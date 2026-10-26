import Modal from '../shared/Modal/Modal.jsx';
import Button from '../shared/Button/Button.jsx';
import { RecordStatus } from './CenterUI.jsx';
import useCenter from './useCenter.js';
import { formatDate } from '../../utils/centerFormat.js';
function AppointmentDetails({
  appointment,
  onClose,
  onEdit
}) {
  const {
    data,
    tr,
    name,
    language,
    dir
  } = useCenter();
  const patient = data.patients.find(item => item.id === appointment.patientId);
  const therapist = data.therapists.find(item => item.id === appointment.therapistId);
  const service = data.services.find(item => item.id === appointment.serviceId);
  const editable = ['pending', 'confirmed'].includes(appointment.status);
  return <Modal className="center-modal" isOpen title={tr('appointmentDetails')} dir={dir} onClose={onClose} footer={<>
      <Button variant="outline" onClick={onClose}>{tr('close')}</Button>
      {editable && onEdit && <Button onClick={onEdit}>{tr('edit.appointment')}</Button>}
    </>}>
    <dl className="center-detail-list">
      <div>
        <dt>{tr('patientId')}</dt>
        <dd>{name(patient?.name)}</dd>
      </div>
      <div>
        <dt>{tr('serviceId')}</dt>
        <dd>{name(service?.name)}</dd>
      </div>
      <div>
        <dt>{tr('therapistId')}</dt>
        <dd>{name(therapist?.name)}</dd>
      </div>
      <div>
        <dt>{tr('dateTime')}</dt>
        <dd>{formatDate(appointment.date, language)} · <bdi>{appointment.time}</bdi></dd>
      </div>
      <div>
        <dt>{tr('status')}</dt>
        <dd><RecordStatus value={appointment.status} /></dd>
      </div>
      {appointment.note && <div>
        <dt>{tr('note')}</dt>
        <dd dir="auto">{appointment.note}</dd>
      </div>}
    </dl>
  </Modal>;
}
export default AppointmentDetails;
