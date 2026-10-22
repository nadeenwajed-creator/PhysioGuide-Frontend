import { callCenter } from './centerPortalService.js';
export const markCenterNotificationsRead = (actor, id) => callCenter('markNotificationsRead', actor, id);
