import { callCenter } from './centerPortalService.js';
export const markCenterNotificationsRead = (actor, id) => callCenter('markNotificationsRead', actor, id);
export const saveCenterNotificationPreferences = (actor, values) => callCenter('saveNotificationPreferences', actor, values);
