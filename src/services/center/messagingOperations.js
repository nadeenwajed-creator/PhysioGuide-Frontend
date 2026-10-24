import {
  actorKey,
  conversationView,
  messageNotifications,
} from './messagingModel.js';

export function createMessagingOperations({
  getState,
  refresh,
  emit,
  fail,
  now,
}) {
  function participant(actor) {
    const state = getState();
    if (
      !['patient', 'physiotherapist'].includes(actor?.role) ||
      actor.centerId !== state.center.id
    )
      fail('forbidden');
    const list = actor.role === 'patient' ? state.patients : state.therapists;
    const id = actor.role === 'patient' ? actor.patientId : actor.therapistId;
    if (!id || !list.some((person) => person.id === id)) fail('forbidden');
    return state;
  }
  function conversation(actor, id) {
    const state = participant(actor);
    const item = state.conversations.find((record) => record.id === id);
    const field = actor.role === 'patient' ? 'patientId' : 'therapistId';
    if (!item || item[field] !== actor[field]) fail('notFound');
    return item;
  }
  async function prepareAttachments(files) {
    if (!Array.isArray(files) || files.length > 5) fail('attachment');
    const allowed = /\.(jpe?g|png|pdf|docx?)$/i;
    if (
      files.some(
        (file) =>
          !file.sourceFile ||
          !allowed.test(file.name) ||
          file.sourceFile.name !== file.name ||
          file.sourceFile.size > 10 * 1024 * 1024
      )
    )
      fail('attachment');
    return Promise.all(
      files.map(async (file) => {
        // Data URLs survive reloads and other tabs; the store reports quota failures.
        const buffer = new Uint8Array(await file.sourceFile.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < buffer.length; offset += 8192)
          binary += String.fromCharCode(
            ...buffer.subarray(offset, offset + 8192)
          );
        return {
          id: crypto.randomUUID(),
          name: file.name,
          size: buffer.length,
          type: file.sourceFile.type,
          url: `data:application/octet-stream;base64,${btoa(binary)}`,
        };
      })
    );
  }
  return {
    async getMessagingWorkspace(actor) {
      refresh();
      const state = participant(actor);
      const field = actor.role === 'patient' ? 'patientId' : 'therapistId';
      const conversations = state.conversations.filter(
        (item) => item[field] === actor[field]
      );
      const patientIds = new Set(conversations.map((item) => item.patientId));
      const therapistIds = new Set(
        conversations.map((item) => item.therapistId)
      );
      if (actor.role === 'patient') patientIds.add(actor.patientId);
      else therapistIds.add(actor.therapistId);
      const contacts = (list, ids) =>
        list
          .filter((item) => ids.has(item.id))
          .map(({ id, name, imageUrl }) => ({ id, name, imageUrl }));
      return structuredClone({
        center: { id: state.center.id, name: state.center.name },
        patients: contacts(state.patients, patientIds),
        therapists: contacts(state.therapists, therapistIds),
        conversations: conversations.map((item) =>
          conversationView(item, actor)
        ),
        notifications: messageNotifications(state, actor.role, actor[field]),
      });
    },
    async markConversationRead(actor, id, messageIds) {
      refresh();
      const item = conversation(actor, id);
      const key = actorKey(actor);
      const ids = new Set(
        messageIds || item.messages.map((message) => message.id)
      );
      let changed = false;
      for (const message of item.messages) {
        if (
          message.senderRole !== actor.role &&
          ids.has(message.id) &&
          !message.readBy.includes(key)
        ) {
          message.readBy.push(key);
          changed = true;
        }
      }
      item.unreadCount = conversationView(item, {
        role: 'physiotherapist',
        therapistId: item.therapistId,
      }).unreadCount;
      if (changed) emit();
    },
    async sendMessage(actor, id, payload) {
      refresh();
      conversation(actor, id);
      const text = String(payload?.text || '').trim();
      const files = payload?.attachments || [];
      if ((!text && !files.length) || text.length > 10000) fail('required');
      const attachments = await prepareAttachments(files);
      refresh();
      const item = conversation(actor, id);
      const senderId =
        actor.role === 'patient' ? actor.patientId : actor.therapistId;
      if (payload.clientId) {
        const duplicate = item.messages.find(
          (message) =>
            message.clientId === payload.clientId &&
            message.senderRole === actor.role &&
            message.senderId === senderId
        );
        if (duplicate) return structuredClone(duplicate);
      }
      const message = {
        id: crypto.randomUUID(),
        clientId: payload.clientId,
        senderRole: actor.role,
        senderId,
        direction: actor.role === 'patient' ? 'incoming' : 'outgoing',
        text,
        attachments,
        sentAt: now().toISOString(),
        status: 'sent',
        readBy: [],
        notificationReadBy: [],
      };
      item.messages.push(message);
      item.unreadCount = conversationView(item, {
        role: 'physiotherapist',
        therapistId: item.therapistId,
      }).unreadCount;
      emit();
      return structuredClone(message);
    },
  };
}
