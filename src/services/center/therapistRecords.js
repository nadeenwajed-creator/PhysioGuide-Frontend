// Capture the old name-based relationship once, before catalog/profile edits.
export function normalizeTherapistServices(state) {
  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLocaleLowerCase();
  for (const therapist of state.therapists || []) {
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

export function assignedTherapistServices(therapist, services = []) {
  return services.filter((service) => therapist?.serviceIds?.includes(service.id));
}

export function therapistServicePrices(therapist, services) {
  return assignedTherapistServices(therapist, services)
    .map((service) => service.price)
    .filter((price) => Number.isFinite(price) && price >= 0);
}
