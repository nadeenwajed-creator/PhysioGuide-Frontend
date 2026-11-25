// Appointment actions (request, status) through the center gateway.

import { callCenter } from './centerPortalService.js';
// Creates or updates a center appointment.
export const saveCenterAppointment = (actor, values, id) => callCenter('saveAppointment', actor, values, id);
// Changes the status of one appointment.
export const updateAppointmentStatus = (actor, id, status) => callCenter('updateAppointmentStatus', actor, id, status);
// Books an appointment as a patient.
export const requestPatientAppointment = (actor, values) => callCenter('requestAppointment', actor, values);
