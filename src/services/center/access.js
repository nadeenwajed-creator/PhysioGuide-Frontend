import { ServiceError } from '../api/serviceError.js';

const permissions = {
  center: ['getWorkspace', 'prepareImage', 'savePatient', 'saveTherapist', 'saveService', 'saveAppointment', 'updateAppointmentStatus', 'addPatientNote', 'saveCenter', 'markNotificationsRead'],
  physiotherapist: ['getWorkspace'],
  patient: ['requestAppointment'],
};

export function authorizeCenterOperation(session, operation) {
  if (!session) throw new ServiceError('unauthenticated');
  if (!permissions[session.role]?.includes(operation)) throw new ServiceError('forbidden');
}
