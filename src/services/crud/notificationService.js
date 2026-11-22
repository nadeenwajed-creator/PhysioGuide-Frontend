import { callCenter } from './centerPortalService.js';
import { callAdmin } from './adminService.js';

// The admin portal keeps its bell on its own endpoints; the patient, centre
// and therapist portals share the centre gateway operations.
export const markNotificationsRead = (actor, id) =>
  actor?.role === 'admin'
    ? callAdmin('markNotificationsRead', id)
    : callCenter('markNotificationsRead', actor, id);
export const markCenterNotificationsRead = markNotificationsRead;
export const saveCenterNotificationPreferences = (actor, values) => callCenter('saveNotificationPreferences', actor, values);
