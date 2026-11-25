// Patient discovery, saved centers, slots, appointments, conversations and reviews.

import { callCenter, subscribeCenter } from './centerPortalService.js';
// Centers and specialties the patient can browse.
export const getPatientDiscovery = actor => callCenter('getPatientDiscovery', actor);
// Centers the patient saved as favourites.
export const getPatientSavedCenters = actor => callCenter('getPatientSavedCenters', actor);
// Posts the patient's review of one center.
export const createPatientReview = (actor, values) => callCenter('createPatientReview', actor, values);
// Adds or removes a center from the saved centers.
export const setPatientFavorite = (actor, centerId, saved) => callCenter('setPatientFavorite', actor, {
  centerId,
  saved
});
// Free slots of a therapist on one date.
export const getPatientSlots = (actor, values) => callCenter('getPatientSlots', actor, values);
// Appointments of the signed-in patient.
export const getPatientAppointments = actor => callCenter('getPatientAppointments', actor);
// Opens, or creates, the conversation with a center.
export const openPatientConversation = (actor, values) => callCenter('openPatientConversation', actor, values);
export { subscribeCenter as subscribePatientDiscovery };
