import { dateKey } from '../utils/centerFormat.js';

export function getPatientAppointmentSummary(appointments, patientId, now = new Date()) {
  const history = appointments.filter(item => item.patientId === patientId)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const current = `${dateKey(now)}${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const lastVisit = history.find(item => ['completed', 'confirmed'].includes(item.status) && `${item.date}${item.time}` <= current);
  return { history, total: history.length, lastVisit };
}
