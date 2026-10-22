import { callCenter } from './centerPortalService.js';
export const saveCenterPatient = (actor, values, id) => callCenter('savePatient', actor, values, id);
export const addPatientNote = (actor, id, text) => callCenter('addPatientNote', actor, id, text);
