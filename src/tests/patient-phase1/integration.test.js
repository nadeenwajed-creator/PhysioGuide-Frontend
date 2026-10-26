import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Vite resolves these static assets in the browser; Node only needs their URLs.
const assets = registerHooks({
  load(url, context, nextLoad) {
    if (/\.(webp|png|jpe?g|svg|txt)(\?.*)?$/.test(url)) {
      return { format: 'module', source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key),
};
globalThis.window = new EventTarget();
const auth = await import('../../services/authService.js');
const { MOCK_PASSWORD } = await import('../../services/auth/mockAccounts.js');
const discovery = await import('../../services/patientDiscoveryService.js');
const messages = await import('../../services/messageService.js');
const { requestPatientAppointment } = await import('../../services/appointmentService.js');
const { subscribeCenter } = await import('../../services/centerPortalService.js');
const repository = await import('../../services/mock/centerRepository.js');
const { createMockCenterAdapter } = await import('../../services/center/mockCenterAdapter.js');
assets.deregister();

test('patient-only gateway notifies subscribers on peer storage changes without a cached Center adapter', async () => {
  await auth.loginPatient({ email: 'patient@example.com', password: MOCK_PASSWORD });
  const actor = auth.getAuthSnapshot().session;
  await messages.getMessagingWorkspace(actor);
  let notifications = 0;
  const unsubscribe = subscribeCenter(() => notifications++);
  try {
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: repository.centerStore.key });
    window.dispatchEvent(event);
    assert.equal(notifications, 1);
    window.dispatchEvent(Object.assign(new Event('storage'), { key: 'unrelated' }));
    assert.equal(notifications, 1);
  } finally { unsubscribe(); }
});

test('registered Patient books and messages with one stable shared identity; favorites and private data stay scoped', async () => {
  const original = auth.getAuthSnapshot().session;
  await discovery.setPatientFavorite(original, 'center-demo', true);
  await discovery.setPatientFavorite(original, 'center-demo', true);
  assert.deepEqual((await discovery.getPatientDiscovery(original)).favoriteIds, ['center-demo']);
  await auth.registerPatient({ fullName: 'Integration Patient', email: 'integration@example.test', password: MOCK_PASSWORD });
  await auth.logout();
  await auth.loginPatient({ email: 'integration@example.test', password: MOCK_PASSWORD });
  const actor = auth.getAuthSnapshot().session;
  assert.deepEqual((await discovery.getPatientDiscovery(actor)).favoriteIds, []);
  assert.deepEqual(await discovery.getPatientAppointments(actor), []);
  assert.deepEqual((await messages.getMessagingWorkspace(actor)).conversations, []);
  await assert.rejects(discovery.getPatientDiscovery({ ...actor, id: original.id }), { code: 'forbidden' });

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const context = { centerId: 'center-demo', therapistId: 'therapist-1', serviceId: 'service-1', date };
  const slots = await discovery.getPatientSlots(actor, context);
  assert(slots.length);
  const appointment = await requestPatientAppointment(actor, { ...context, time: slots[0] });
  assert.equal(appointment.status, 'pending');
  assert.equal(appointment.patientId, `patient-account-${actor.id}`);
  await assert.rejects(requestPatientAppointment(actor, { ...context, time: slots[0] }), { code: 'conflict' });
  const first = await discovery.openPatientConversation(actor, context);
  assert.deepEqual(await discovery.openPatientConversation(actor, context), first);
  await messages.sendMessage(actor, first.id, { text: 'Shared patient message', clientId: 'patient-integration' });
  const therapist = { role: 'physiotherapist', centerId: context.centerId, therapistId: context.therapistId };
  const adapter = createMockCenterAdapter(repository.readMockCenter(context.centerId), { store: repository.getCenterStore(context.centerId) });
  assert((await adapter.getMessagingWorkspace(therapist)).conversations.some(c => c.id === first.id));
  const reply = await adapter.sendMessage(therapist, first.id, { text: 'Shared reply', clientId: 'reply-integration' });
  await messages.sendMessage(actor, first.id, { text: 'After peer update', clientId: 'after-peer' });
  await messages.markConversationRead(actor, first.id, [reply.id]);
  let workspace = await messages.getMessagingWorkspace(actor);
  assert.equal(workspace.conversations[0].messages.length, 3);
  assert.equal(workspace.conversations[0].unreadCount, 0);
  const notification = workspace.notifications.find(n => n.id.endsWith(reply.id));
  assert.equal(notification.isRead, false);
  assert.equal(workspace.notifications.filter(n => n.id === notification.id).length, 1);
  const { markNotificationsRead } = await import('../../services/notificationService.js');
  await markNotificationsRead(actor, notification.id);
  workspace = await messages.getMessagingWorkspace(actor);
  assert.equal(workspace.notifications.find(n => n.id === notification.id).isRead, true);
  const stored = repository.readMockCenter(context.centerId);
  assert.equal(stored.patients.filter(p => p.id === appointment.patientId).length, 1);
  assert.equal(stored.appointments.filter(a => a.id === appointment.id).length, 1);
  await auth.logout();
  await auth.loginPatient({ email: 'patient@example.com', password: MOCK_PASSWORD });
  const demo = auth.getAuthSnapshot().session;
  assert(!(await discovery.getPatientAppointments(demo)).some(a => a.id === appointment.id));
  await assert.rejects(messages.sendMessage(demo, first.id, { text: 'Unauthorized' }), { code: 'notFound' });
});
