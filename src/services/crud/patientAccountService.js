// Patient account reads/writes: profile, photo, preferences and password.

import { callCenter, subscribeCenter } from './centerPortalService.js';
// Account data of the signed-in patient.
export const getPatientAccount = actor => callCenter('getPatientAccount', actor);
// Saves the patient profile.
export const savePatientProfile = (actor, values) => callCenter('savePatientProfile', actor, values);
// Validates and shrinks a profile photo before upload.
export const preparePatientImage = (actor, file) => callCenter('preparePatientImage', actor, file);
// Saves the patient's notification switches.
export const savePatientPreferences = (actor, values) => callCenter('savePatientPreferences', actor, values);
// Changes the patient password.
export const changePatientPassword = (actor, values) => callCenter('changePatientPassword', actor, values);
export { subscribeCenter as subscribePatientAccount };
