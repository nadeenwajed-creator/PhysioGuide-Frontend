import { callCenter } from './centerPortalService.js';
export const markNotificationsRead = (actor, id) => callCenter('markNotificationsRead', actor, id);
export const markCenterNotificationsRead = markNotificationsRead;
export const saveCenterNotificationPreferences = (actor, values) => callCenter('saveNotificationPreferences', actor, values);
