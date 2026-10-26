export const participantKey = (role, id) => `${role}:${id}`;

// Upgrade legacy therapist-relative messages without replacing IDs or stored text.
export function normalizeMessages(state) {
  for (const conversation of state.conversations || []) {
    const incoming = (conversation.messages || []).filter(
      (message) => message.direction === 'incoming'
    );
    const unread = new Set(
      conversation.unreadCount > 0
        ? incoming.slice(-conversation.unreadCount).map((message) => message.id)
        : []
    );
    for (const message of conversation.messages || []) {
      if (message.senderRole) continue;
      const fromPatient = message.direction === 'incoming';
      message.senderRole = fromPatient ? 'patient' : 'physiotherapist';
      message.senderId = fromPatient
        ? conversation.patientId
        : conversation.therapistId;
      const recipient = participantKey(
        fromPatient ? 'physiotherapist' : 'patient',
        fromPatient ? conversation.therapistId : conversation.patientId
      );
      const alreadyRead = fromPatient
        ? !unread.has(message.id)
        : message.status === 'read';
      message.readBy = alreadyRead ? [recipient] : [];
      message.notificationReadBy = alreadyRead ? [recipient] : [];
    }
  }
  return state;
}

export function actorKey(actor) {
  return participantKey(
    actor.role,
    actor.role === 'patient' ? actor.patientId : actor.therapistId
  );
}

export function conversationView(conversation, actor) {
  const key = actorKey(actor);
  const messages = (conversation.messages || [])
    .map((message) => {
      const outgoing =
        message.senderRole === actor.role &&
        message.senderId === (actor.patientId || actor.therapistId);
      const recipient = participantKey(
        message.senderRole === 'patient' ? 'physiotherapist' : 'patient',
        message.senderRole === 'patient'
          ? conversation.therapistId
          : conversation.patientId
      );
      return {
        ...message,
        direction: outgoing ? 'outgoing' : 'incoming',
        status:
          outgoing && message.readBy?.includes(recipient)
            ? 'read'
            : message.status,
        isRead: outgoing || message.readBy?.includes(key) || false,
      };
    })
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  return {
    ...conversation,
    messages,
    unreadCount: messages.filter((message) => !message.isRead).length,
  };
}

export function messageNotifications(state, role, id) {
  const field = role === 'patient' ? 'patientId' : 'therapistId';
  const receiptField =
    role === 'patient'
      ? 'patientNotificationReadIds'
      : 'therapistNotificationReadIds';
  const receipts = new Set(state[receiptField]?.[id] || []);
  const key = participantKey(role, id);
  return (state.conversations || [])
    .filter((conversation) => conversation[field] === id)
    .flatMap((conversation) =>
      conversation.messages
        .filter((message) => message.senderRole !== role && !message.notificationSuppressedFor?.includes(key))
        .map((message) => {
          const notificationId = `message:${conversation.id}:${message.id}`;
          return {
            id: notificationId,
            [field]: id,
            type: 'message',
            titleKey:
              role === 'patient' ? 'therapistMessageTitle' : 'messageTitle',
            messageKey:
              role === 'patient' ? 'therapistMessageBody' : 'messageBody',
            createdAt: message.sentAt,
            isRead:
              receipts.has(notificationId) ||
              message.notificationReadBy?.includes(key) ||
              false,
            target: { kind: 'conversation', id: conversation.id },
          };
        })
    );
}
