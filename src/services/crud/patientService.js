// Center-side patient writes: create, update, delete and notes.

import { callCenter } from './centerPortalService.js';
// Creates or updates a patient of the center.
export const saveCenterPatient = (actor, values, id) => callCenter('savePatient', actor, values, id);
// Appends a note to a patient record.
export const addPatientNote = (actor, id, text) => callCenter('addPatientNote', actor, id, text);
