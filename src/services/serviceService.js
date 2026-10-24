import { callCenter } from './centerPortalService.js';
export const saveCenterService = (actor, values, id) => callCenter('saveService', actor, values, id);
