import Avatar from '../shared/Avatar/Avatar.jsx';
import Button from '../shared/Button/Button.jsx';
import ActionsMenu from '../shared/ActionsMenu/ActionsMenu.jsx';
import { RecordStatus, EmptyState } from './CenterUI.jsx';
import useCenter from './useCenter.js';
import { formatDate } from '../../utils/centerFormat.js';
import { appointmentActions } from '../../services/center/appointmentRules.js';
function AppointmentsTable({
  appointments,
  onEdit,
  onStatus
}) {
  const {
    data,
    tr,
    name,
    language
  } = useCenter();
  if (!appointments.length) return <EmptyState>{tr('noAppointments')}</EmptyState>;
  return <table className="center-table center-table--appointments">
    <thead><tr>{['patientId', 'serviceId', 'therapistId', 'dateTime', 'status', 'actions'].map(key => <th scope="col" key={key}>{tr(key)}</th>)}</tr></thead>
    <tbody>
      {appointments.map(appointment => {
        const patient = data.patients.find(item => item.id === appointment.patientId);
        const therapist = data.therapists.find(item => item.id === appointment.therapistId);
        const service = data.services.find(item => item.id === appointment.serviceId);
        const permitted = appointmentActions(appointment);
        const editable = permitted.includes('edit');
        const actions = editable ? [{
          label: tr('edit.appointment'),
          onClick: () => onEdit(appointment)
        }, ...(appointment.status === 'confirmed' ? [{
          label: tr('complete'),
          onClick: () => onStatus(appointment, 'completed')
        }] : []), {
          label: tr(appointment.status === 'pending' ? 'reject' : 'cancelAppointment'),
          variant: 'danger',
          onClick: () => onStatus(appointment, 'cancelled')
        }] : [];
        return <tr key={appointment.id} data-status={appointment.status}>
        <td className="center-table__identity" data-label={tr('patientId')}><div className="center-identity">
            <Avatar src={patient?.imageUrl} name={name(patient?.name)} size="sm" />
            <div>
              <strong>{name(patient?.name)}</strong>
              <small><bdi>{patient?.phone}</bdi></small>
            </div>
          </div></td>
        <td data-label={tr('serviceId')}><span>{name(service?.name)}</span></td>
        <td data-label={tr('therapistId')}><span>{name(therapist?.name)}</span></td>
        <td data-label={tr('dateTime')}>
          <div>
            {formatDate(appointment.date, language)}
            <small><bdi>{appointment.time}</bdi></small>
          </div>
        </td>
        <td className="center-table__status" data-label={tr('status')}><div><RecordStatus value={appointment.status} /></div></td>
        <td className="center-table__actions" data-label={tr('actions')}><div className="center-actions">
            {permitted.includes('confirm') && <Button size="sm" onClick={() => onStatus(appointment, 'confirmed')}>{tr('confirm')}</Button>}
            <ActionsMenu items={actions} ariaLabel={`${tr('actions')}: ${name(patient?.name)}`} />
            {!actions.length && <span aria-label={tr('noActions')}>—</span>}
          </div></td>
      </tr>;
      })}
    </tbody>
  </table>;
}
export default AppointmentsTable;
