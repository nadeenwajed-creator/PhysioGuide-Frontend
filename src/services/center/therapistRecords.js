// Capture the old name-based relationship once, before catalog/profile edits.
export function normalizeTherapistServices(state) {
  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLocaleLowerCase();
  for (const therapist of state.therapists || []) {
    if (!Array.isArray(therapist.schedule)) {
      therapist.schedule = defaultTherapistSchedule(therapist.id);
    }
    if (Array.isArray(therapist.serviceIds)) continue;
    therapist.serviceIds = (state.services || [])
      .filter((service) => ['en', 'ar'].some((language) => {
        const specialty = normalize(therapist.specialty?.[language]);
        return specialty && specialty === normalize(service.name?.[language]);
      }))
      .map((service) => service.id);
  }
  return state;
}

// A therapist without a stored week works the demo week (Saturday-Thursday).
// The centre can change any day from the working-hours dialog.
export function defaultTherapistSchedule(therapistId) {
  return [6, 0, 1, 2, 3, 4].map((day) => ({
    id: `schedule-${therapistId}-${day}`,
    day,
    start: '09:00',
    end: '16:00',
    isAvailable: true,
  }));
}

export function assignedTherapistServices(therapist, services = []) {
  return services.filter((service) => therapist?.serviceIds?.includes(service.id));
}

export function therapistServicePrices(therapist, services) {
  return assignedTherapistServices(therapist, services)
    .map((service) => service.price)
    .filter((price) => Number.isFinite(price) && price >= 0);
}
