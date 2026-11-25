// Pain assessment calls: submit, history and one saved result.

import { callCenter } from './centerPortalService.js';
import { ServiceError } from '../api/serviceError.js';
import { toAssessmentSubmission } from '../patient/painAssessmentModel.js';

// Sends a completed pain assessment.
export function submitAssessment(actor, state) {
  const answers = toAssessmentSubmission(state);
  if (!answers) throw new ServiceError('validation');
  return callCenter('submitAssessment', actor, answers);
}

// Saved assessments of the patient.
export const getAssessmentHistory = (actor) => callCenter('getAssessmentHistory', actor);
// One saved assessment by id.
export const getAssessment = (actor, id) => callCenter('getAssessment', actor, id);
