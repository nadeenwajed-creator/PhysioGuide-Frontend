import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { candidateTimes } from '../../services/patient/discoveryModel.js';
import { serviceMatches, filterCenters } from '../../services/patient/specialtyMatching.js';
import { matchingCenters } from '../../services/patient/painAssessmentModel.js';
import { patientRefinementsEn, patientRefinementsAr } from '../../locales/patientRefinements.js';

const assets = registerHooks({ load(url, context, next) {
  if (/\.(webp|png|jpe?g|svg|txt)(\?.*)?$/.test(url)) return { format: 'module', source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
  return next(url, context);
} });
const saved = new Map();
globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
globalThis.window = new EventTarget();
const auth = await import('../../services/authService.js');
const { MOCK_PASSWORD } = await import('../../services/auth/mockAccounts.js');
const { getPatientDiscovery } = await import('../../services/patientDiscoveryService.js');
const { savePatientPreferences } = await import('../../services/patientAccountService.js');
const { getMessagingWorkspace } = await import('../../services/messageService.js');
const { createMockCenterAdapter } = await import('../../services/center/mockCenterAdapter.js');
const repository = await import('../../services/mock/centerRepository.js');
const { recipientPreferences, notificationPreference, syncAppointmentReminders, appointmentAlerts } = await import('../../services/patient/notificationPolicy.js');
assets.deregister();

test('disabled message alerts suppress event generation without losing delivery, unread state or receipts', async () => {
  await auth.loginPatient({ email: 'patient@example.com', password: MOCK_PASSWORD });
  const actor = auth.getAuthSnapshot().session;
  await savePatientPreferences(actor, { newMessages: false, appointmentUpdates: true, appointmentReminders: false });
  const before = await getMessagingWorkspace(actor), conversation = before.conversations[0];
  const adapter = createMockCenterAdapter(repository.readMockCenter('center-demo'), { store: repository.centerStore });
  const therapist = { role: 'physiotherapist', centerId: 'center-demo', therapistId: conversation.therapistId };
  const muted = await adapter.sendMessage(therapist, conversation.id, { text: 'Muted alert; delivered message', clientId: 'muted-message' });
  let view = await getMessagingWorkspace(actor);
  assert(view.conversations[0].messages.some(m => m.id === muted.id));
  assert.equal(view.conversations[0].unreadCount, conversation.unreadCount + 1);
  assert(!view.notifications.some(n => n.id.endsWith(muted.id)));
  assert.equal(recipientPreferences(repository.readMockCenter('center-demo'), actor.patientId).newMessages, false);
  await savePatientPreferences(actor, { newMessages: true, appointmentUpdates: true, appointmentReminders: false });
  view = await getMessagingWorkspace(actor);
  assert(!view.notifications.some(n => n.id.endsWith(muted.id)), 'No historical muted alert resurrection');
  const enabled = await adapter.sendMessage(therapist, conversation.id, { text: 'Enabled future alert', clientId: 'enabled-message' });
  view = await getMessagingWorkspace(actor);
  const alert = view.notifications.find(n => n.id.endsWith(enabled.id));
  assert(alert); assert.equal(notificationPreference(alert), 'newMessages');
  await adapter.markConversationRead({ ...actor, centerId: 'center-demo' }, conversation.id, [enabled.id]);
  assert.equal((await getMessagingWorkspace(actor)).notifications.find(n => n.id === alert.id).isRead, false);
});

test('appointment update alerts follow their own preference and shared appointment status', async () => {
  const actor = auth.getAuthSnapshot().session;
  const workspace = repository.readMockCenter('center-demo');
  const rows = workspace.appointments.filter(a => a.patientId === actor.patientId && a.status === 'confirmed');
  assert(rows.length >= 2);
  const adapter = createMockCenterAdapter(workspace, { store: repository.centerStore });
  const center = { role: 'center', centerId: 'center-demo' };
  await savePatientPreferences(actor, { newMessages: true, appointmentUpdates: false, appointmentReminders: false });
  await adapter.updateAppointmentStatus(center, rows[0].id, 'completed');
  assert(!repository.readMockCenter('center-demo').patientNotifications?.some(n => n.type === 'appointmentUpdate' && n.target.id === rows[0].id));
  await savePatientPreferences(actor, { newMessages: true, appointmentUpdates: true, appointmentReminders: false });
  await adapter.updateAppointmentStatus(center, rows[1].id, 'cancelled');
  const view = await getMessagingWorkspace(actor);
  assert(view.notifications.some(n => n.type === 'appointmentUpdate' && n.target.id === rows[1].id));
  assert.equal(repository.readMockCenter('center-demo').appointments.find(a => a.id === rows[1].id).status, 'cancelled');
});

test('mock reminders are scoped, idempotent, preference-aware and invalidated by cancellation', () => {
  const now = new Date('2030-01-01T08:00:00');
  const workspace = { patients: [{ id: 'patient-1' }], appointments: [{ id: 'reminder-test', patientId: 'patient-1', date: '2030-01-01', time: '10:00', status: 'confirmed' }] };
  const key = 'physioguide.mock.patient-preferences.v1:account-patient';
  const before = saved.get(key);
  saved.delete(key);
  assert.equal(syncAppointmentReminders(workspace, 'patient-1', now), true);
  assert.equal(syncAppointmentReminders(workspace, 'patient-1', now), false);
  assert.equal(appointmentAlerts(workspace, 'patient-1').length, 1);
  assert.equal(appointmentAlerts(workspace, 'other').length, 0);
  workspace.appointments[0].status = 'cancelled';
  assert.equal(appointmentAlerts(workspace, 'patient-1').length, 0);
  if (before !== undefined) saved.set(key, before);
});

test('Center service edits and replies propagate to the same Patient public records and IDs', async () => {
  const actor = auth.getAuthSnapshot().session;
  const workspace = repository.readMockCenter('center-demo');
  const adapter = createMockCenterAdapter(workspace, { store: repository.centerStore });
  const center = { role: 'center', centerId: 'center-demo' }, service = workspace.services[0], review = workspace.reviews[0];
  await adapter.saveService(center, { name: service.name.en, nameAr: service.name.ar, description: service.description.en, descriptionAr: service.description.ar, price: '88', duration: '75', imageUrl: service.imageUrl }, service.id);
  await adapter.updateReview(center, review.id, { reply: 'Shared response for regression test' });
  const view = (await getPatientDiscovery(actor)).centers.find(c => c.id === workspace.center.id);
  assert.equal(view.services.find(s => s.id === service.id).price, 88);
  assert.equal(view.services.find(s => s.id === service.id).duration, 75);
  assert.equal(view.reviews.find(r => r.id === review.id).reply, 'Shared response for regression test');
  assert.equal(view.reviews.find(r => r.id === review.id).authorImageUrl, workspace.patients.find(p => p.id === review.patientId).imageUrl);
  assert.equal(view.rating, view.reviews.reduce((n, r) => n + r.rating, 0) / view.reviews.length);
});

test('specialty matching normalizes names and reuses shared mock records only with explicit provenance', async () => {
  assert(serviceMatches({ name: 'Post Surgery Rehabilitation' }, 'care:postsurgery'));
  assert(serviceMatches({ name: 'علاج الام الظهر' }, 'care:back'));
  const data = await getPatientDiscovery(auth.getAuthSnapshot().session);
  assert.equal(data.mode, 'mock');
  assert.equal(matchingCenters(data.centers, 'knee').length, 0, 'Default never presents mocks as verified real centers');
  assert(matchingCenters(data.centers, 'knee', { allowMock: true }).some(c => c.id === 'center-demo'));
  assert.equal(matchingCenters(data.centers.map(c => ({ ...c, approvalStatus: 'pending' })), 'knee', { allowMock: true }).length, 0);
  assert.deepEqual(filterCenters(data.centers, { specialty: 'care:knee' }).map(c => c.id), ['center-demo']);
  assert.equal(filterCenters(data.centers, { search: 'Knee Rehabilitation', specialty: 'care:knee', price: '1' }).length, 0);
  assert.equal(filterCenters(data.centers, { search: 'Knee Rehabilitation', specialty: 'care:knee', price: '100' }).length, 1);
});

test('candidate rail times reflect actual hours and complete duration; invalid inputs fabricate no slots', () => {
  const hours = { weekStart: '09:00', weekEnd: '11:00' };
  assert.deepEqual(candidateTimes(hours, 90, '2030-01-07', new Date('2029-01-01')), ['09:00', '09:30']);
  for (const args of [[null, 60, '2030-01-07'], [hours, 0, '2030-01-07'], [hours, 60, '2030-02-31']]) assert.deepEqual(candidateTimes(...args), []);
});

test('all newly visible refinement labels have both English and Arabic translations', () => {
  assert.deepEqual(Object.keys(patientRefinementsEn), Object.keys(patientRefinementsAr));
  for (const key of Object.keys(patientRefinementsAr)) assert.match(patientRefinementsAr[key], /[\u0600-\u06ff]/);
});
