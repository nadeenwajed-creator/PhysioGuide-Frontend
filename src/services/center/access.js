import { ServiceError } from '../api/serviceError.js';

const permissions = {
  center: ['getWorkspace', 'prepareImage', 'savePatient', 'saveTherapist', 'getTherapistSchedule', 'saveTherapistSchedule', 'saveService', 'saveAppointment', 'updateAppointmentStatus', 'addPatientNote', 'updateReview', 'saveCenter', 'updateCenterImages', 'addGalleryImage', 'saveNotificationPreferences', 'markNotificationsRead', 'changeCenterPassword'],
  physiotherapist: ['getWorkspace', 'getMessagingWorkspace', 'prepareImage', 'saveOwnProfile', 'saveNotificationPreferences', 'markConversationRead', 'sendMessage', 'markNotificationsRead'],
  patient: ['getPatientAccount', 'savePatientProfile', 'preparePatientImage', 'savePatientPreferences', 'changePatientPassword', 'getPatientDiscovery', 'getPatientSavedCenters', 'setPatientFavorite', 'createPatientReview', 'getPatientSlots', 'getPatientAppointments', 'openPatientConversation', 'requestAppointment', 'getMessagingWorkspace', 'markConversationRead', 'sendMessage', 'markNotificationsRead', 'submitAssessment', 'getAssessmentHistory', 'getAssessment'],
};

export function authorizeCenterOperation(session, operation) {
  if (!session) throw new ServiceError('unauthenticated');
  if (!permissions[session.role]?.includes(operation)) throw new ServiceError('forbidden');
}
