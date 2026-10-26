import { ServiceError } from '../api/serviceError.js';

const permissions = {
  center: ['getWorkspace', 'prepareImage', 'savePatient', 'saveTherapist', 'saveService', 'saveAppointment', 'updateAppointmentStatus', 'addPatientNote', 'updateReview', 'saveCenter', 'updateCenterImages', 'addGalleryImage', 'saveNotificationPreferences', 'markNotificationsRead', 'changeCenterPassword'],
  physiotherapist: ['getWorkspace', 'getMessagingWorkspace', 'prepareImage', 'saveOwnProfile', 'markConversationRead', 'sendMessage', 'markNotificationsRead'],
  patient: ['getPatientAccount', 'savePatientProfile', 'preparePatientImage', 'savePatientPreferences', 'changePatientPassword', 'getPatientDiscovery', 'setPatientFavorite', 'getPatientSlots', 'getPatientAppointments', 'openPatientConversation', 'requestAppointment', 'getMessagingWorkspace', 'markConversationRead', 'sendMessage', 'markNotificationsRead'],
};

export function authorizeCenterOperation(session, operation) {
  if (!session) throw new ServiceError('unauthenticated');
  if (!permissions[session.role]?.includes(operation)) throw new ServiceError('forbidden');
}
