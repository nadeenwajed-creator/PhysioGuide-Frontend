import { callCenter } from './centerPortalService.js';

export const getMessagingWorkspace = (actor) =>
  callCenter('getMessagingWorkspace', actor);
export const markConversationRead = (actor, id, messageIds) =>
  callCenter('markConversationRead', actor, id, messageIds);
export const sendMessage = (actor, id, payload) =>
  callCenter('sendMessage', actor, id, payload);

export async function downloadMessageAttachment(file) {
  const url = new URL(file.url, window.location.origin);
  const local =
    url.origin === window.location.origin &&
    ['http:', 'https:', 'blob:'].includes(url.protocol);
  const data = /^data:(application\/octet-stream|text\/plain);base64,/i.test(
    file.url
  );
  if (!local && !data) throw new Error('attachment');
  const response = await fetch(url);
  if (!response.ok) throw new Error('attachment');
  const blob = await response.blob();
  const source = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = source;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(source), 1000);
}
