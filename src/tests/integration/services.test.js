import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from '../../services/api/httpClient.js';
import { createOperationAdapter } from '../../services/api/operationAdapter.js';
import { ServiceError } from '../../services/api/serviceError.js';
import { createBrowserStore } from '../../services/mock/browserStore.js';
import { createMockAuthAdapter } from '../../services/auth/mockAuthAdapter.js';
import { createMockCenterAdapter } from '../../services/center/mockCenterAdapter.js';
import { appointmentActions } from '../../services/center/appointmentRules.js';
import { getDashboardSummary } from '../../services/centerSummaryService.js';
import { authorizeCenterOperation } from '../../services/center/access.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
}
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const credentials = email => ({ email, password: 'PhysioGuide123!' });
const center = { id: 'account-center', role: 'center', centerId: 'center-demo' };
const clock = () => new Date(2030, 0, 10, 12);
const seed = () => ({
  today: '2030-01-10', center: { id: 'center-demo', name: { en: 'Center' } },
  patients: ['p1', 'p2'].map(id => ({ id, name: { en: id }, status: 'active', notes: [] })),
  therapists: ['t1', 't2'].map(id => ({ id, name: { en: id }, availability: 'available' })),
  services: [{ id: 's1', duration: 45, status: 'active' }], appointments: [], reviews: [], conversations: [], notifications: [],
});
const booking = (extra = {}) => ({ patientId: 'p1', therapistId: 't1', serviceId: 's1', date: '2030-01-10', time: '09:00', ...extra });

test('malformed saved envelopes fail without silently replacing existing records', () => {
  const memory = storage();
  const store = createBrowserStore('records', { storage: () => memory });
  for (const raw of ['{', 'null', '{"version":1}', '{"version":1,"data":null}']) {
    memory.setItem('records', raw);
    assert.throws(() => store.read(), { code: 'storageUnavailable' });
    assert.equal(memory.getItem('records'), raw);
  }
  memory.setItem('records', '{"version":2,"data":{}}');
  assert.throws(() => store.read(), { code: 'storageVersion' });
});

test('HTTP client supports REST verbs, query encoding, headers, bodies and 204', async () => {
  const sent = [];
  const client = createHttpClient({ baseUrl: 'https://api.example.test/v1/', getHeaders: () => ({ 'X-Test': 'value' }), fetcher: async (url, options) => {
    sent.push({ url, ...options }); return response({ ok: true }, options.method === 'DELETE' ? 204 : 200);
  } });
  await client.get('records', { query: { name: 'a & b', missing: undefined } });
  for (const method of ['post', 'put', 'patch']) assert.deepEqual(await client[method]('records', { data: { name: 'Example' } }), { ok: true });
  assert.equal(await client.delete('records/1'), null);
  assert.deepEqual(sent.map(item => item.method), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  assert.equal(new URL(sent[0].url).searchParams.get('name'), 'a & b');
  assert.equal(sent[1].body, '{"name":"Example"}');
  assert.equal(sent[1].headers['X-Test'], 'value');
  assert.equal(sent[1].credentials, 'omit');
});

test('transport rejects unconfigured/cross-origin paths before sending credentials', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return response({}); };
  await assert.rejects(createHttpClient({ fetcher }).get('/unconfigured'), { code: 'unavailable' });
  await assert.rejects(createHttpClient({ fetcher, baseUrl: 'https://api.example.test' }).get('https://other.example.test'), { code: 'unavailable' });
  assert.equal(calls, 0);
});

test('HTTP failures normalize status and do not expose raw messages', async () => {
  for (const [status, code] of [[401, 'unauthenticated'], [403, 'forbidden'], [404, 'notFound'], [409, 'conflict'], [422, 'validation'], [429, 'rateLimited'], [500, 'server']]) {
    const client = createHttpClient({ baseUrl: 'https://api.example.test', fetcher: async () => response({ internal: 'private-server-detail' }, status) });
    await assert.rejects(client.get('/test'), error => error.code === code && !error.message.includes('private-server-detail'));
  }
});

test('timeouts cover session headers, fetch and response-body reading; caller cancellation works', async () => {
  const hanging = () => new Promise(() => {});
  const waitingForSession = createHttpClient({ baseUrl: 'https://api.example.test', getHeaders: hanging, timeoutMs: 15 });
  await assert.rejects(waitingForSession.get('/test'), { code: 'timeout' });
  for (const fetcher of [hanging, async () => ({ ok: true, status: 200, json: hanging })]) {
    const client = createHttpClient({ baseUrl: 'https://api.example.test', fetcher, timeoutMs: 15 });
    await assert.rejects(client.get('/test'), { code: 'timeout' });
  }
  const controller = new AbortController();
  const client = createHttpClient({ baseUrl: 'https://api.example.test', fetcher: hanging });
  const pending = client.get('/test', { signal: controller.signal }); controller.abort();
  await assert.rejects(pending, { code: 'cancelled' });
});

test('API operation mappings isolate requests, response DTOs and field-error translation', async () => {
  let called = 0;
  const client = { post: async (path, options) => { called++; assert.equal(path, '/test-only-contract'); assert.equal(options.data.person, 'Alice'); return { result: { number: 42 } }; } };
  const adapter = createOperationAdapter(client, { create: { request: name => ({ method: 'POST', path: '/test-only-contract', data: { person: name } }), response: raw => ({ id: String(raw.result.number) }) } });
  assert.deepEqual(await adapter.execute('create', 'Alice'), { id: '42' });
  await assert.rejects(adapter.execute('unconfigured'), { code: 'unavailable' }); assert.equal(called, 1);
  const validation = createOperationAdapter({ patch: async () => { throw new ServiceError('validation', { status: 422 }); } }, {
    update: { request: () => ({ method: 'PATCH', path: '/test-only' }), response: data => data, error: () => new ServiceError('validation', { fields: { email: 'email' } }) },
  });
  await assert.rejects(validation.execute('update'), error => error.fields.email === 'email');
});

test('mock role login rejects invalid, wrong-portal and pending accounts', async () => {
  const adapter = createMockAuthAdapter({ delay: 0, getTherapists: () => [{ id: 't1', name: { en: 'Therapist' }, email: 'staff@example.com' }] });
  await assert.rejects(adapter.loginCenter({ ...credentials('center@example.com'), password: 'wrong' }), { code: 'invalidCredentials' });
  await assert.rejects(adapter.loginPatient(credentials('center@example.com')), { code: 'invalidCredentials' });
  await assert.rejects(adapter.loginCenter(credentials('pending@example.com')), { code: 'accountPending' });
  assert.equal((await adapter.loginCenter(credentials('center@example.com'))).role, 'center');
  assert.equal((await adapter.loginCenter(credentials('staff@example.com'))).session.therapistId, 't1');
  assert.equal((await adapter.loginPatient(credentials('patient@example.com'))).role, 'patient');
});

test('signup persists metadata, keeps Center pending, and stores no passwords or tokens', async () => {
  const memory = storage(); const accountStore = createBrowserStore('accounts', { storage: () => memory });
  const adapter = createMockAuthAdapter({ delay: 0, accountStore });
  assert.equal((await adapter.registerCenter({ ...credentials('new-center@example.com'), centerName: 'New Center', phone: '0591234567', location: { address: 'Nablus' } })).status, 'pending-review');
  await assert.rejects(adapter.loginCenter(credentials('new-center@example.com')), { code: 'accountPending' });
  await adapter.registerPatient({ ...credentials('new-patient@example.com'), fullName: 'New Patient' });
  const restored = createMockAuthAdapter({ delay: 0, accountStore });
  assert.equal((await restored.loginPatient(credentials('new-patient@example.com'))).session.name, 'New Patient');
  const raw = memory.getItem('accounts'); assert(!raw.includes('PhysioGuide123!')); assert(!/password|token/i.test(raw));
  await assert.rejects(restored.registerPatient({ ...credentials('new-patient@example.com'), fullName: 'Duplicate' }), { code: 'duplicateEmail' });
});

test('session restoration resolves canonical roles, expires, and logout removes the marker', async () => {
  const memory = storage();const sessionStore = createBrowserStore('session', { storage: () => memory }); let time = 100;
  const create = () => createMockAuthAdapter({ delay: 0, sessionStore, now: () => time });
  await create().loginPatient(credentials('patient@example.com'));
  const marker = sessionStore.read(); sessionStore.write({ ...marker, role: 'center' });
  assert.equal((await create().restoreSession()).role, 'patient');
  await create().logout(); assert.equal(await create().restoreSession(), null);
  await create().loginPatient(credentials('patient@example.com'));time += 13 * 60 * 60 * 1000;
  assert.equal(await create().restoreSession(), null);
});

test('new provisioned therapist identities are resolved without separate public signup', async () => {
  const staff = []; const adapter = createMockAuthAdapter({ delay: 0, getTherapists: () => staff });
  await assert.rejects(adapter.loginCenter(credentials('provisioned@example.com')), { code: 'invalidCredentials' });
  staff.push({ id: 'provisioned', email: 'provisioned@example.com', name: 'Provisioned Therapist' });
  assert.equal((await adapter.loginCenter(credentials('provisioned@example.com'))).role, 'physiotherapist');
});

test('center creation confirms, patient request pends, and origin cannot be supplied by form text', async () => {
  const adapter = createMockCenterAdapter(seed(), { now: clock });
  const created = await adapter.saveAppointment(center, booking({ origin: 'patient', status: 'pending' }));
  assert.equal(created.origin, 'center'); assert.equal(created.status, 'confirmed'); assert(!appointmentActions(created).includes('confirm'));
  const request = await adapter.requestAppointment({ role: 'patient', patientId: 'p2' }, booking({ patientId: 'p2', time: '10:00' }));
  assert.equal(request.origin, 'patient'); assert.equal(request.status, 'pending'); assert(appointmentActions(request).includes('confirm'));
  const confirmed = await adapter.updateAppointmentStatus(center, request.id, 'confirmed'); assert(!appointmentActions(confirmed).includes('confirm'));
  await assert.rejects(adapter.updateAppointmentStatus(center, request.id, 'confirmed'), { code: 'closedAppointment' });
});

test('creation and editing reject overlapping therapist/patient intervals but allow adjacent slots', async () => {
  const adapter = createMockCenterAdapter(seed(), { now: clock });
  const first = await adapter.saveAppointment(center, booking());
  await assert.rejects(adapter.saveAppointment(center, booking({ patientId: 'p2', time: '09:15' })), { code: 'conflict' });
  await assert.rejects(adapter.saveAppointment(center, booking({ therapistId: 't2', time: '09:15' })), { code: 'conflict' });
  const adjacent = await adapter.saveAppointment(center, booking({ patientId: 'p2', time: '09:45' }));
  await assert.rejects(adapter.saveAppointment(center, booking({ patientId: 'p2', time: '09:30' }), adjacent.id), { code: 'conflict' });
  await adapter.saveAppointment(center, booking(), first.id);
  await adapter.updateAppointmentStatus(center, first.id, 'cancelled');
  await adapter.saveAppointment(center, booking());
});

test('mock saves survive adapter reconstruction and summaries use the same records', async () => {
  const memory = storage(), store = createBrowserStore('records', { storage: () => memory });
  const adapter = createMockCenterAdapter(seed(), { store, now: clock }); let events = 0;adapter.subscribe(() => events++);
  const patient = await adapter.savePatient(center, { name: 'Patient', email: 'p@example.com', phone: '0599999999', status: 'active' });
  await adapter.saveAppointment(center, booking({ patientId: patient.id, date: '2030-01-11' }));
  const restored = createMockCenterAdapter(seed(), { store, now: clock });const data = await restored.getWorkspace(center);
  assert.equal(data.patients.length, 3);assert.equal(getDashboardSummary(data).upcoming.length, 1);assert.equal(events, 2);
  data.patients.length = 0; assert.equal((await restored.getWorkspace(center)).patients.length, 3);
});

test('failed persistence rolls back the mutation and never reports a successful save', async () => {
  const store = { read: () => null, write: () => { throw new ServiceError('storageUnavailable'); } };
  const adapter = createMockCenterAdapter(seed(), { store, now: clock });let events = 0;adapter.subscribe(() => events++);
  await assert.rejects(adapter.saveAppointment(center, booking()), { code: 'storageUnavailable' });
  assert.equal((await adapter.getWorkspace(center)).appointments.length, 0);assert.equal(events, 0);
});

test('center adapter rejects restricted roles and a different center', async () => {
  const adapter = createMockCenterAdapter(seed(), { now: clock });
  await assert.rejects(adapter.saveAppointment({ role: 'physiotherapist', centerId: 'center-demo', therapistId: 't1' }, booking()), { code: 'forbidden' });
  await assert.rejects(adapter.getWorkspace({ ...center, centerId: 'another-center' }), { code: 'forbidden' });
  const own = await adapter.getWorkspace({ role: 'physiotherapist', centerId: 'center-demo', therapistId: 't1' });
  assert.equal(own.therapists.length, 1);assert.equal(own.therapists[0].id, 't1');assert.equal('appointments' in own, false);
});

test('role permissions apply independently of the selected mock or API adapter', () => {
  assert.throws(() => authorizeCenterOperation(null, 'getWorkspace'), { code: 'unauthenticated' });
  assert.throws(() => authorizeCenterOperation({ role: 'physiotherapist' }, 'saveAppointment'), { code: 'forbidden' });
  assert.throws(() => authorizeCenterOperation({ role: 'patient' }, 'getWorkspace'), { code: 'forbidden' });
  assert.doesNotThrow(() => authorizeCenterOperation({ role: 'patient' }, 'requestAppointment'));
  assert.doesNotThrow(() => authorizeCenterOperation(center, 'saveAppointment'));
});

test('cancelled records leave active Dashboard summaries and staff email collisions are rejected', async () => {
  const adapter = createMockCenterAdapter(seed(), { now: clock, reservedEmails: () => ['center@example.com'] });
  const record = await adapter.saveAppointment(center, booking());
  assert.equal(getDashboardSummary(await adapter.getWorkspace(center)).todayAppointments.length, 1);
  await adapter.updateAppointmentStatus(center, record.id, 'cancelled');
  assert.equal(getDashboardSummary(await adapter.getWorkspace(center)).todayAppointments.length, 0);
  await assert.rejects(adapter.saveTherapist(center, { name: 'Staff', email: 'center@example.com', phone: '0591111111', specialty: 'Mobility', experience: '2', price: '25', availability: 'available' }), { code: 'duplicateEmail' });
});
