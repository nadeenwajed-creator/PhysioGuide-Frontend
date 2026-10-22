import { ServiceError } from '../api/serviceError.js';

const permissions = {
  center: ['getWorkspace', 'prepareImage', 'savePatient', 'saveTherapist', 'saveService', 'deleteService', 'saveAppointment', 'updateAppointmentStatus', 'addPatientNote', 'updateReview', 'saveCenter', 'saveNotificationPreferences', 'markNotificationsRead', 'changeCenterPassword'],
  physiotherapist: ['getWorkspace'],
  patient: ['requestAppointment'],
};

export function authorizeCenterOperation(session, operation) {
  if (!session) throw new ServiceError('unauthenticated');
  if (!permissions[session.role]?.includes(operation)) throw new ServiceError('forbidden');
}
