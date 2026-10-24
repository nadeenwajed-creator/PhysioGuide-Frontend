import { messageNotifications } from './messagingModel.js';
// Message alerts come from existing incoming messages, never from outgoing replies.
export function getTherapistNotifications(state, therapistId) {
  const messages = messageNotifications(state, 'physiotherapist', therapistId);
  return [
    ...(state.therapistNotifications || []).filter(item => item.therapistId === therapistId),
    ...messages,
  ];
}

export function addProfessionalNotification(state, therapistId, kind, createdAt) {
  state.therapistNotifications ??= [];
  state.therapistNotifications.push({
    id: crypto.randomUUID(),
    therapistId,
    type: 'therapist',
    titleKey: `${kind}Title`,
    messageKey: `${kind}Body`,
    createdAt,
    isRead: false,
    target: { kind: 'professional' },
  });
}
