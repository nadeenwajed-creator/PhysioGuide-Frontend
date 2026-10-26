import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { appointmentCounts, appointmentGroup, profileErrors } from '../../services/patient/accountModel.js';

const assets = registerHooks({ load(url, context, next) {
  if (/\.(webp|png|jpe?g|svg|txt)(\?.*)?$/.test(url)) return { format: 'module', source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
  return next(url, context);
} });
const saved = new Map();
let failAccounts = false;
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => { if (failAccounts && key === 'physioguide.mock.accounts.v1') throw new Error('Test storage failure'); saved.set(key, value); },
  removeItem: key => saved.delete(key),
};
globalThis.window = new EventTarget();
const auth = await import('../../services/authService.js');
const { MOCK_PASSWORD } = await import('../../services/auth/mockAccounts.js');
const account = await import('../../services/patientAccountService.js');
const discovery = await import('../../services/patientDiscoveryService.js');
const messaging = await import('../../services/messageService.js');
const repository = await import('../../services/mock/centerRepository.js');
const { createMockCenterAdapter } = await import('../../services/center/mockCenterAdapter.js');
assets.deregister();
const draft = { name: 'Patient Updated', phone: '0591234567', dateOfBirth: '1998-03-12', gender: 'female', city: 'Nablus', imageUrl: '' };
const login = async () => { await auth.loginPatient({ email: 'patient@example.com', password: MOCK_PASSWORD }); return auth.getAuthSnapshot().session; };

test('appointment groups preserve Center statuses and care counts agree with lists', () => {
  const rows = ['pending', 'confirmed', 'completed', 'cancelled'].map(status => ({ status, date: '2001-01-01' }));
  assert.deepEqual(appointmentCounts(rows), { upcoming: 2, completed: 1, cancelled: 1 });
  assert.equal(appointmentGroup(rows[0]), 'upcoming');
});

test('profile saves propagate identity while preserving newest messages, receipts and Center notes', async () => {
  const actor = await login();
  const first = await account.getPatientAccount(actor);
  assert(['', 'male', 'female', 'other'].includes(first.profile.gender));
  const originalName = structuredClone(first.profile.name);
  await account.savePatientProfile(actor, { ...draft, name: originalName.en || originalName });
  assert.deepEqual((await account.getPatientAccount(actor)).profile.name, originalName);
  const workspace = repository.readMockCenter('center-demo');
  const beforeOther = workspace.patients.find(p => p.id !== actor.patientId);
  const conversation = (await messaging.getMessagingWorkspace(actor)).conversations[0];
  const adapter = createMockCenterAdapter(workspace, { store: repository.centerStore });
  await adapter.sendMessage({ role: 'physiotherapist', centerId: 'center-demo', therapistId: conversation.therapistId }, conversation.id, { text: 'Newest message before profile save', clientId: 'account-test' });
  const latest = repository.readMockCenter('center-demo');
  await account.savePatientProfile(actor, draft);
  const result = await account.getPatientAccount(auth.getAuthSnapshot().session);
  assert.equal(result.profile.email, actor.email);
  assert.equal(result.profile.city, draft.city);
  assert.equal(auth.getAuthSnapshot().session.name.en || auth.getAuthSnapshot().session.name, draft.name);
  const after = repository.readMockCenter('center-demo');
  assert.deepEqual(after.conversations, latest.conversations);
  assert.deepEqual(after.patients.find(p => p.id !== actor.patientId), beforeOther);
  assert.deepEqual(after.patients.find(p => p.id === actor.patientId).notes, workspace.patients.find(p => p.id === actor.patientId).notes);
  assert.equal(after.patients.find(p => p.id === actor.patientId).birthDate, draft.dateOfBirth);
  assert.notEqual(first.profile.name, draft.name);
  await auth.logout();
  await login();
  assert.equal((await account.getPatientAccount(auth.getAuthSnapshot().session)).profile.city, draft.city);
});

test('profile and preference ownership, validation, password boundary and rollback', async () => {
  const actor = await login();
  await assert.rejects(account.savePatientProfile({ ...actor, id: 'other' }, draft), { code: 'forbidden' });
  await assert.rejects(account.savePatientProfile(actor, { ...draft, email: 'other@example.test' }), { code: 'forbidden' });
  await assert.rejects(account.savePatientProfile(actor, { ...draft, dateOfBirth: '2000-02-31' }), { code: 'validation' });
  await assert.rejects(account.preparePatientImage(actor, { type: 'text/html', size: 10 }), { code: 'image' });
  await assert.rejects(account.preparePatientImage(actor, { type: 'image/png', size: 6 * 1024 * 1024 }), { code: 'image' });
  const before = repository.readMockCenter('center-demo');
  failAccounts = true;
  try { await assert.rejects(account.savePatientProfile(actor, { ...draft, name: 'Must roll back' }), { code: 'storageUnavailable' }); }
  finally { failAccounts = false; }
  assert.deepEqual(repository.readMockCenter('center-demo'), before);
  await discovery.setPatientFavorite(actor, 'center-demo', true);
  const prefs = { appointmentUpdates: false, appointmentReminders: true, newMessages: false };
  await account.savePatientPreferences(actor, prefs);
  assert.deepEqual((await account.getPatientAccount(actor)).preferences, prefs);
  assert.deepEqual((await discovery.getPatientDiscovery(actor)).favoriteIds, ['center-demo']);
  const messageState = await messaging.getMessagingWorkspace(actor);
  assert.equal(messageState.notificationPreferences.newMessages, false);
  assert(messageState.notifications.length > 0); // Preferences never delete receipt history.
  await assert.rejects(account.savePatientPreferences(actor, { ...prefs, reviews: true }), { code: 'validation' });
  const stored = JSON.stringify([...saved]);
  await assert.rejects(account.changePatientPassword(actor, { currentPassword: 'sample-only', newPassword: 'different-sample' }), { code: 'passwordUnavailable' });
  assert.equal(JSON.stringify([...saved]), stored);
});

test('new Patient account profile is independent and appointment projection excludes private notes', async () => {
  await auth.registerPatient({ fullName: 'New Patient', email: 'new-account@example.test', password: MOCK_PASSWORD });
  await auth.loginPatient({ email: 'new-account@example.test', password: MOCK_PASSWORD });
  const actor = auth.getAuthSnapshot().session;
  assert.deepEqual((await account.getPatientAccount(actor)).preferences, { appointmentUpdates: true, appointmentReminders: true, newMessages: true });
  assert.deepEqual(await discovery.getPatientAppointments(actor), []);
  await account.savePatientProfile(actor, { ...draft, name: 'New Patient Edited' });
  await discovery.openPatientConversation(actor, { centerId: 'center-demo', therapistId: 'therapist-1' });
  const record = repository.readMockCenter('center-demo').patients.find(p => p.accountId === actor.id);
  assert.equal(record.city, draft.city);
  const original = await login();
  const appointments = await discovery.getPatientAppointments(original);
  assert(appointments.length);
  assert(appointments.every(a => a.patientId === original.patientId && !('note' in a)));
  assert(Object.keys(profileErrors({ ...draft, dateOfBirth: '2999-01-01' })).includes('dateOfBirth'));
});
