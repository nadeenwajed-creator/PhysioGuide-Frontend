// Center-side service writes: create, update and delete.

import { callCenter } from './centerPortalService.js';
export const saveCenterService = (actor, values, id) => callCenter('saveService', actor, values, id);
