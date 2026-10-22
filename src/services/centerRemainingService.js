import { callCenter } from './centerPortalService.js';
import { getDashboardSummary } from './centerSummaryService.js';

export { deleteCenterService } from './serviceService.js';
export { saveCenterNotificationPreferences as saveCenterPreferences } from './notificationService.js';

export const saveCenterInformation = (actor, values) => callCenter('saveCenter', actor, values);
export const replyToCenterReview = (actor, id, text) => callCenter('updateReview', actor, id, { reply: text });
export const changeCenterPassword = (actor, values) => callCenter('changeCenterPassword', actor, values);

export function getReviewStatistics(workspace) {
  const reviews = workspace.reviews;
  return {
    count: reviews.length,
    average: getDashboardSummary(workspace).averageRating,
    distribution: [5, 4, 3, 2, 1].map(rating => {
      const count = reviews.filter(review => review.rating === rating).length;
      return { rating, count, percentage: reviews.length ? count / reviews.length * 100 : 0 };
    }),
  };
}
