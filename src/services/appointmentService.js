import { callCenter } from './centerPortalService.js';
export const saveCenterAppointment = (actor, values, id) => callCenter('saveAppointment', actor, values, id);
export const updateAppointmentStatus = (actor, id, status) => callCenter('updateAppointmentStatus', actor, id, status);
export const requestPatientAppointment = (actor, values) => callCenter('requestAppointment', actor, values);
