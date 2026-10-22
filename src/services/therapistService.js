import { callCenter } from './centerPortalService.js';
export const saveCenterTherapist = (actor, values, id) => callCenter('saveTherapist', actor, values, id);
