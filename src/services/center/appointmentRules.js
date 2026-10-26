export const appointmentStatuses = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export function appointmentActions(appointment) {
  if (appointment.status === 'pending' && appointment.origin === 'patient') return ['confirm', 'edit', 'cancel'];
  if (appointment.status === 'confirmed') return ['edit', 'complete', 'cancel'];
  return [];
}

export function overlapsBooking(candidate, appointments, services, excludedId) {
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const duration = item => item.durationMinutes ?? services.find(service => service.id === item.serviceId)?.duration ?? 45;
  const start = minutes(candidate.time);
  return appointments.some(item => item.id !== excludedId
    && item.date === candidate.date
    && ['pending', 'confirmed'].includes(item.status)
    && (item.therapistId === candidate.therapistId || item.patientId === candidate.patientId)
    && start < minutes(item.time) + duration(item)
    && start + duration(candidate) > minutes(item.time));
}
