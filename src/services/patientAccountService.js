import { callCenter, subscribeCenter } from './centerPortalService.js';
export const getPatientAccount = actor => callCenter('getPatientAccount', actor);
export const savePatientProfile = (actor, values) => callCenter('savePatientProfile', actor, values);
export const preparePatientImage = (actor, file) => callCenter('preparePatientImage', actor, file);
export const savePatientPreferences = (actor, values) => callCenter('savePatientPreferences', actor, values);
export const changePatientPassword = (actor, values) => callCenter('changePatientPassword', actor, values);
export { subscribeCenter as subscribePatientAccount };
