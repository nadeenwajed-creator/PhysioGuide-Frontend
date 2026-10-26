import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockAuthAdapter } from '../../services/auth/mockAuthAdapter.js';
import { createBrowserStore } from '../../services/mock/browserStore.js';
import { getPatientAppointmentSummary } from '../../services/patientSummaryService.js';

function setup(extra = {}) {
  const records = new Map();
  const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  const accountStore = createBrowserStore('accounts', { storage: () => storage });
  const sessionStore = createBrowserStore('session', { storage: () => storage });
  const create = () => createMockAuthAdapter({ delay: 0, accountStore, sessionStore, ...extra });
  return { create, records, sessionStore, accountStore };
}
const admin = { id: 'test-reviewer', role: 'admin' };
const request = email => ({ email, password: 'PhysioGuide123!', centerName: 'Registered Center', phone: '0591234567', location: { address: 'Nablus Street', coordinates: { latitude: 32.22, longitude: 35.26 }, confirmed: true } });

test('pending application retains registration details across adapter recreation and rejects access', async () => {
  const { create, records, sessionStore } = setup();
  const result = await create().registerCenter(request('pending-new@example.com'));
  const adapter = create();
  const rows = await adapter.listCenterApplications({ actor: admin, status: 'pending' });
  assert.equal(rows.length, 1);
  const application = await adapter.getCenterApplication({ actor: admin, id: result.applicationId });
  assert.equal(application.id, rows[0].id);
  assert.equal(application.approvalStatus, 'pending');
  assert.equal(application.phone, '0591234567');
  assert.deepEqual(application.location, request('').location);
  assert(application.submittedAt);
  assert(!JSON.stringify([...records.values()]).match(/password|PhysioGuide123|jwt|token/i));
  await assert.rejects(adapter.loginCenter(request(application.email)), { code: 'accountPending' });
  sessionStore.write({ accountId: application.id, expiresAt: Date.now() + 60000 });
  assert.equal(await adapter.restoreSession(), null);
  await assert.rejects(adapter.listCenterApplications({ actor: { role: 'center' } }), { code: 'forbidden' });
  await assert.rejects(adapter.reviewCenterApplication({ actor: { role: 'patient' }, id: application.id, decision: 'approved' }), { code: 'forbidden' });
});

test('approval activates one center identity, permits login and rejects repeated decisions', async () => {
  const activated = [];
  const { create } = setup({ activateCenter: app => activated.push(app.centerId) });
  const adapter = create();
  const { applicationId: id } = await adapter.registerCenter(request('approved-new@example.com'));
  const reviewed = await adapter.reviewCenterApplication({ actor: admin, id, decision: 'approved' });
  assert.deepEqual(activated, [reviewed.centerId]);
  assert.equal(reviewed.status, reviewed.approvalStatus);
  const session = (await create().loginCenter(request(reviewed.email))).session;
  assert.equal(session.centerId, reviewed.centerId);
  assert.equal(session.name, 'Registered Center');
  await assert.rejects(adapter.reviewCenterApplication({ actor: admin, id, decision: 'rejected' }), { code: 'conflict' });
});

test('rejected applications remain durable and cannot restore a forged session', async () => {
  const { create, sessionStore } = setup();
  const adapter = create();
  const { applicationId: id } = await adapter.registerCenter(request('rejected-new@example.com'));
  await adapter.reviewCenterApplication({ actor: admin, id, decision: 'rejected', reason: 'Incomplete application' });
  const item = await create().getCenterApplication({ actor: admin, id });
  assert.equal(item.approvalStatus, 'rejected');
  assert.equal(item.reviewReason, 'Incomplete application');
  await assert.rejects(adapter.loginCenter(request(item.email)), { code: 'accountRejected' });
  sessionStore.write({ accountId: id, expiresAt: Date.now() + 60000 });
  assert.equal(await adapter.restoreSession(), null);
});

test('activation failure leaves the application pending and retryable', async () => {
  let failure = true;
  const { create } = setup({ activateCenter: () => { if (failure) throw new Error('Storage unavailable'); } });
  const adapter = create();
  const { applicationId: id } = await adapter.registerCenter(request('retry@example.com'));
  await assert.rejects(adapter.reviewCenterApplication({ actor: admin, id, decision: 'approved' }));
  assert.equal((await adapter.getCenterApplication({ actor: admin, id })).status, 'pending');
  failure = false;
  assert.equal((await adapter.reviewCenterApplication({ actor: admin, id, decision: 'approved' })).status, 'approved');
});

test('logout in another adapter invalidates an already restored session', async () => {
  const { create } = setup();
  const first = create();
  await first.loginCenter(request('center@example.com'));
  assert(await first.restoreSession());
  await create().logout();
  assert.equal(await first.restoreSession(), null);
});

test('center identity follows the current profile name without changing login email', async () => {
  let name = { en: 'First name', ar: 'First Arabic name' };
  const { create } = setup({ getCenter: () => ({ name }) });
  const adapter = create();
  assert.deepEqual((await adapter.loginCenter(request('center@example.com'))).session.name, name);
  name = { en: 'Updated center', ar: 'Updated Arabic name' };
  assert.deepEqual((await adapter.restoreSession()).name, name);
  assert.equal((await adapter.restoreSession()).email, 'center@example.com');
});

test('visit summary excludes future, cancelled and unconfirmed bookings while counting all records', () => {
  const appointments = [
    ['1', '2030-01-09', 'completed'], ['2', '2030-01-10', 'confirmed'],
    ['3', '2030-01-11', 'confirmed'], ['4', '2030-01-10', 'cancelled'], ['5', '2030-01-10', 'pending'],
  ].map(([id, date, status]) => ({ id, date, status, time: '09:00', patientId: 'p1' }));
  appointments.push({ id: '6', date: '2030-01-10', time: '18:00', status: 'confirmed', patientId: 'p1' });
  const now = new Date(2030, 0, 10, 12);
  const summary = getPatientAppointmentSummary(appointments, 'p1', now);
  assert.equal(summary.total, 6);
  assert.equal(summary.lastVisit.id, '2');
  assert.equal(getPatientAppointmentSummary(appointments, 'new', now).lastVisit, undefined);
  assert.equal(getPatientAppointmentSummary(appointments, 'new', now).total, 0);
});
