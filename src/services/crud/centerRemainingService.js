// Center profile, preferences, review replies and password calls.

import { callCenter } from './centerPortalService.js';
import { getDashboardSummary } from '../centerSummaryService.js';

export { saveCenterNotificationPreferences as saveCenterPreferences } from './notificationService.js';

// Saves the logo and gallery of a center.
export const updateCenterImages = (actor, values) => callCenter('updateCenterImages', actor, values);
// Saves the name, address and about text of a center.
export const saveCenterInformation = (actor, values) => callCenter('saveCenter', actor, values);
// Posts the center's reply to one review.
export const replyToCenterReview = (actor, id, text) => callCenter('updateReview', actor, id, { reply: text });
// Changes the password of a center account.
export const changeCenterPassword = (actor, values) => callCenter('changeCenterPassword', actor, values);

// Average rating and rating counts of a center's reviews.
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
