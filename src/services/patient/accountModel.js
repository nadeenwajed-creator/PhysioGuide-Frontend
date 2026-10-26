// Shared by Profile and Appointments: status, not the clock, owns care history.
// An overdue pending request remains actionable until the Center changes its status.
export const appointmentTabs = ['upcoming', 'completed', 'cancelled'];

export function appointmentGroup(appointment) {
  return ['completed', 'cancelled'].includes(appointment.status) ? appointment.status : 'upcoming';
}

export function appointmentCounts(rows) {
  return Object.fromEntries(appointmentTabs.map(tab => [tab, rows.filter(row => appointmentGroup(row) === tab).length]));
}
export const preferenceKeys = ['appointmentUpdates', 'appointmentReminders', 'newMessages'];
export const defaultPatientPreferences = Object.fromEntries(preferenceKeys.map(key => [key, true]));

export function profileErrors(values, today = new Date()) {
  const errors = {};
  if (typeof values.name !== 'string' || !values.name.trim() || values.name.trim().length > 100) errors.name = 'required';
  if (typeof values.phone !== 'string'
    || values.phone
    && (!/^[+\d\s()-]{7,25}$/.test(values.phone) || values.phone.replace(/\D/g, '').length < 7
    || values.phone.replace(/\D/g, '').length > 15)) errors.phone = 'invalid';
  if (typeof values.city !== 'string' || values.city.length > 100) errors.city = 'invalid';
  if (!['', 'female', 'male', 'other'].includes(values.gender)) errors.gender = 'invalid';
  if (typeof values.dateOfBirth !== 'string') errors.dateOfBirth = 'invalid';
  else if (values.dateOfBirth) {
    const date = new Date(values.dateOfBirth + 'T12:00:00');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth) || !Number.isFinite(date.getTime())
      || date.getFullYear() !== Number(values.dateOfBirth.slice(0, 4))
      || date.getMonth() + 1 !== Number(values.dateOfBirth.slice(5, 7))
      || date.getDate() !== Number(values.dateOfBirth.slice(8, 10))
      || date > new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)) errors.dateOfBirth = 'invalid';
  }
  if (typeof values.imageUrl !== 'string' || values.imageUrl.length > 7 * 1024 * 1024
    || values.imageUrl && !/^(\/(?!\/)|https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(values.imageUrl)) errors.imageUrl = 'image';
  return errors;
}
