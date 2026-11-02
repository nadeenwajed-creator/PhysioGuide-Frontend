import { callCenter } from './centerPortalService.js';

export const getMessagingWorkspace = (actor) =>
  callCenter('getMessagingWorkspace', actor);
export const markConversationRead = (actor, id, messageIds) =>
  callCenter('markConversationRead', actor, id, messageIds);
export const sendMessage = (actor, id, payload) =>
  callCenter('sendMessage', actor, id, payload);

// Attachments live on the API origin, not the SPA origin, so both are allowed
// for the same-origin download path; data: URLs come from the demo mode.
const apiOrigin = () => {
  const root = String(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (!root) return '';
  try {
    return new URL(root, window.location.origin).origin;
  } catch {
    return '';
  }
};

export async function downloadMessageAttachment(file) {
  const url = new URL(file.url, window.location.origin);
  const allowed = new Set([window.location.origin, apiOrigin()].filter(Boolean));
  const local =
    allowed.has(url.origin) &&
    ['http:', 'https:', 'blob:'].includes(url.protocol);
  const data = file.url.startsWith('data:');
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
