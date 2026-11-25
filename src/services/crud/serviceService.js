// Center-side service writes: create, update and delete.

import { callCenter } from './centerPortalService.js';
// Creates or updates a service offered by the center.
export const saveCenterService = (actor, values, id) => callCenter('saveService', actor, values, id);
