import { callCenter, subscribeCenter } from './centerPortalService.js';
export const getPatientDiscovery = actor => callCenter('getPatientDiscovery', actor);
export const setPatientFavorite = (actor, centerId, saved) => callCenter('setPatientFavorite', actor, {
  centerId,
  saved
});
export const getPatientSlots = (actor, values) => callCenter('getPatientSlots', actor, values);
export const getPatientAppointments = actor => callCenter('getPatientAppointments', actor);
export const openPatientConversation = (actor, values) => callCenter('openPatientConversation', actor, values);
export { subscribeCenter as subscribePatientDiscovery };
