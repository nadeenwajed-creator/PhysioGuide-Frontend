import { overlapsBooking } from '../center/appointmentRules.js';

export const patientIdentity = actor => actor.patientId || `patient-account-${actor.id}`;

// Public discovery exposes an allowlist, never the private workspace itself.
export function publicCenter(workspace) {
  const { center, services, therapists, reviews, patients } = workspace;
  const visibleReviews = reviews.filter(r => !['hidden', 'rejected', 'removed'].includes(r.status) && r.visible !== false && Number.isFinite(r.rating)
      && r.rating >= 1
    && r.rating <= 5);
  return {
    ...Object.fromEntries(['id', 'name', 'imageUrl', 'gallery', 'about', 'address', 'city', 'hours', 'phone', 'email'].map(k => [k, center[k]])),
    services: services.filter(s => s.status === 'active').map(({ id, name, description, price, duration, imageUrl, specialty }) => ({
      id,
      name,
      description,
      price,
      duration,
      imageUrl,
      specialty
    })),
    therapists: therapists.filter(t => t.status !== 'inactive').map(({
      id,
      name,
      imageUrl,
      specialty,
      experience,
      about,
      rating,
      serviceIds,
      availability,
      credentials,
      languages
      }) => ({
        id,
        name,
        imageUrl,
        specialty,
        experience,
        about,
        rating,
        serviceIds,
        availability,
        credentials,
        languages
    })),
    reviews: visibleReviews.map(({ id, rating, text, date, reply, patientId }) => ({
      id,
      rating,
      text,
      date,
      reply,
      author: patients.find(p => p.id === patientId)?.name,
      authorImageUrl: patients.find(p => p.id === patientId)?.imageUrl
    })),
    rating: visibleReviews.length ? visibleReviews.reduce((n, r) => n + r.rating, 0) / visibleReviews.length : null
  };
}

// Mock candidates use clinic hours and shared booking conflicts; the API must own real availability.
export function availableSlots(workspace, { therapistId, serviceId, date, patientId }, now = new Date()) {
  const service = workspace.services.find(s => s.id === serviceId && s.status === 'active');
  const therapist = workspace.therapists.find(t => t.id === therapistId && t.status !== 'inactive' && t.availability === 'available'
    && t.serviceIds?.includes(serviceId));
  if (!service || !therapist || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const day = new Date(date + 'T12:00:00');
  if (Number.isNaN(day.getTime()) || day.getFullYear() !== Number(date.slice(0, 4))
    || day.getMonth() + 1 !== Number(date.slice(5, 7))
    || day.getDate() !== Number(date.slice(8, 10))) return [];
  return candidateTimes(workspace.center.hours, service.duration, date, now).filter(time => !overlapsBooking({
    therapistId,
    serviceId,
    date,
    time,
    patientId,
    durationMinutes: service.duration
  }, workspace.appointments, workspace.services));
}

// Candidates reflect actual hours/duration. Only the availability service may
// declare them selectable; missing or invalid schedule data yields no candidates.
export function candidateTimes(hours, duration, date, now = new Date()) {
  if (!hours || !Number.isFinite(duration) || duration <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const day = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(day.getTime()) || day.getFullYear() !== Number(date.slice(0, 4))
    || day.getMonth() + 1 !== Number(date.slice(5, 7))
    || day.getDate() !== Number(date.slice(8, 10))) return [];
  const friday = day.getDay() === 5;
  const start = hours[friday ? 'fridayStart' : 'weekStart'],
    end = hours[friday ? 'fridayEnd' : 'weekEnd'];
  if (![start, end].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return [];
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const result = [];
  for (let value = minutes(start); value + duration <= minutes(end); value += 30) {
    const time = `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    if (new Date(`${date}T${time}`) > now) result.push(time);
  }
  return result;
}
