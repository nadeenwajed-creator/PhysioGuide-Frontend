import { callCenter } from './centerPortalService.js';
export const saveCenterTherapist = (actor, values, id) => callCenter('saveTherapist', actor, values, id);
export const saveOwnTherapistProfile = (actor, values) => callCenter('saveOwnProfile', actor, values);
//  صورة المعالج تُرفع عبر مساحة المعالج، لا مساحة المركز
export const prepareTherapistImage = file =>
  callCenter('prepareImage', file, 'physiotherapist');
