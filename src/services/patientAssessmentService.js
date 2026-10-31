import { callCenter } from './centerPortalService.js';
import { ServiceError } from './api/serviceError.js';
import { toAssessmentSubmission } from './patient/painAssessmentModel.js';

export function submitAssessment(actor, state) {
  const answers = toAssessmentSubmission(state);
  if (!answers) throw new ServiceError('validation');
  return callCenter('submitAssessment', actor, answers);
}

export const getAssessmentHistory = (actor) => callCenter('getAssessmentHistory', actor);
export const getAssessment = (actor, id) => callCenter('getAssessment', actor, id);
