import { mockAccounts } from '../auth/mockAccounts.js';
import { mockAccountStore } from '../mock/accountRepository.js';
import { createBrowserStore } from '../mock/browserStore.js';
import { defaultPatientPreferences } from './accountModel.js';

export function notificationPreference(notification) {
  return notification.type === 'message'
    ? 'newMessages'
    : notification.type === 'appointmentReminder' ? 'appointmentReminders' : 'appointmentUpdates';
}

// Resolve recipient preferences through the existing account identity, never email.
export function recipientPreferences(state, patientId) {
  const patient = state.patients.find(p => p.id === patientId);
  const accounts = [...mockAccounts, ...(mockAccountStore.read() || [])];
  const accountId = patient?.accountId || accounts.find(a => a.role === 'patient' && a.patientId === patientId)?.id;
  const saved = accountId
    ? createBrowserStore(`physioguide.mock.patient-preferences.v1:${encodeURIComponent(accountId)}`).read()
    : null;
  return {
    ...defaultPatientPreferences,
    ...saved?.notificationPreferences
  };
}

export function addAppointmentAlert(state, appointment, now) {
  if (!recipientPreferences(state, appointment.patientId).appointmentUpdates) return;
  state.patientNotifications ??= [];
  state.patientNotifications.push({
    id: crypto.randomUUID(),
    patientId: appointment.patientId,
    type: 'appointmentUpdate',
    titleKey: 'appointmentUpdateTitle',
    messageKey: 'appointmentUpdateBody',
    createdAt: now.toISOString(),
    isRead: false,
    target: {
      kind: 'appointment',
      id: appointment.id
    }
  });
}

// Local mock reminders are evaluated on workspace refresh, not by a push server.
// Record even muted reminders so re-enabling never resurrects an old muted event.
export function syncAppointmentReminders(state, patientId, now) {
  let changed = false;
  const enabled = recipientPreferences(state, patientId).appointmentReminders;
  for (const appointment of state.appointments || []) {
    const start = new Date(`${appointment.date}T${appointment.time}`).getTime();
    const id = `reminder:${appointment.id}:${appointment.date}:${appointment.time}`;
    if (appointment.patientId !== patientId || appointment.status !== 'confirmed' || start <= now.getTime()
      || start - now.getTime() > 86400000) continue;
    state.patientNotifications ??= [];
    if (state.patientNotifications.some(n => n.id === id)) continue;
    state.patientNotifications.push({
      id,
      patientId,
      type: 'appointmentReminder',
      titleKey: 'appointmentReminderTitle',
      messageKey: 'appointmentReminderBody',
      createdAt: now.toISOString(),
      isRead: false,
      suppressed: !enabled,
      target: {
        kind: 'appointment',
        id: appointment.id
      }
    });
    changed = true;
  }
  return changed;
}

export function appointmentAlerts(state, patientId) {
  const receipts = new Set(state.patientNotificationReadIds?.[patientId] || []);
  return (state.patientNotifications || []).filter(n => n.patientId === patientId && !n.suppressed
      && (n.type !== 'appointmentReminder'
    || state.appointments.some(a => a.id === n.target.id && a.status === 'confirmed' && `reminder:${a.id}:${a.date}:${a.time}` === n.id))).map(n => ({
    ...n,
    isRead: n.isRead || receipts.has(n.id)
  }));
}
