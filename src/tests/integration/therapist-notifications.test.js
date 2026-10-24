import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockCenterAdapter } from '../../services/center/mockCenterAdapter.js';
import { authorizeCenterOperation } from '../../services/center/access.js';

const center = { id: 'center', role: 'center', centerId: 'clinic' };
const therapist = id => ({ id: `staff:${id}`, role: 'physiotherapist', centerId: 'clinic', therapistId: id });
const professional = { specialty: 'Manual', specialtyAr: '', experience: 5, availability: 'available' };
const serviceValues = { name: 'Manual', nameAr: '', description: 'Care', descriptionAr: '', price: 25, duration: 45, imageUrl: null };

function setup() {
  let stored = {
    center: { id: 'clinic', name: { en: 'Clinic' } },
    therapists: ['a', 'b'].map(id => ({
      id, centerId: 'clinic', name: { en: id, ar: '' }, email: `${id}@example.com`, phone: '0591234567',
      specialty: { en: 'Manual', ar: '' }, experience: 5, availability: 'available', serviceIds: id === 'a' ? ['s1'] : [],
    })),
    services: [{ id: 's1', name: { en: 'Manual', ar: '' }, description: { en: 'Care', ar: '' }, price: 25, duration: 45, imageUrl: null }],
    conversations: ['a', 'b'].map(id => ({ id: `c-${id}`, therapistId: id, patientId: `p-${id}`, unreadCount: 1, messages: [
      { id: `in-${id}`, direction: 'incoming', sentAt: '2030-01-10T10:00:00Z', text: 'Private message' },
      { id: `out-${id}`, direction: 'outgoing', sentAt: '2030-01-10T10:01:00Z', text: 'Reply' },
    ] })),
    notifications: [{ id: 'center-only', isRead: false }], patients: [], appointments: [], reviews: [],
  };
  let failWrites = false;
  const store = {
    read: () => structuredClone(stored),
    write: value => {
      if (failWrites) throw Object.assign(new Error('storageUnavailable'), { code: 'storageUnavailable' });
      stored = structuredClone(value);
    },
  };
  const create = () => createMockCenterAdapter(store.read(), { store, now: () => new Date('2030-01-10T12:00:00Z') });
  return { adapter: create(), create, read: store.read, fail: () => { failWrites = true; }, update: callback => callback(stored) };
}

test('professional alerts are recipient-only and created only for actual edits', async () => {
  const { adapter, create } = setup();
  await adapter.saveTherapist(center, professional, 'a');
  assert.equal((await adapter.getWorkspace(therapist('a'))).notifications.length, 1);
  await adapter.saveTherapist(center, { ...professional, experience: 6 }, 'a');
  await adapter.saveTherapist(center, { ...professional, experience: 6 }, 'a');
  const own = (await create().getWorkspace(therapist('a'))).notifications;
  assert.equal(own.length, 2);
  assert.equal(own.find(item => item.type === 'therapist').titleKey, 'professionalTitle');
  assert.equal((await adapter.getWorkspace(therapist('b'))).notifications.length, 1);
  const centerData = await adapter.getWorkspace(center);
  assert.deepEqual(centerData.notifications, [{ id: 'center-only', isRead: false }]);
  assert.equal(centerData.therapistNotifications, undefined);
});

test('service edits notify assigned therapists and preserve legacy assignments on rename', async () => {
  const { adapter, update } = setup();
  await adapter.saveService(center, serviceValues, 's1');
  assert.equal((await adapter.getWorkspace(therapist('a'))).notifications.length, 1);
  await adapter.saveService(center, { ...serviceValues, price: 30 }, 's1');
  assert.equal((await adapter.getWorkspace(therapist('a'))).notifications[0].titleKey, 'servicesTitle');
  assert.equal((await adapter.getWorkspace(therapist('b'))).notifications.length, 1);
  update(state => { delete state.therapists[0].serviceIds; });
  adapter.reload();
  await adapter.saveService(center, { ...serviceValues, name: 'Renamed' }, 's1');
  const own = await adapter.getWorkspace(therapist('a'));
  assert.equal(own.services.length, 1);
  assert.equal(own.services[0].id, 's1');
  assert.deepEqual(own.therapists[0].serviceIds, ['s1']);
  assert.equal(own.notifications.filter(item => item.titleKey === 'servicesTitle').length, 2);
});

test('mark-one/all persist without affecting other recipients or Center receipts', async () => {
  const { adapter, create, read } = setup();
  await adapter.saveTherapist(center, { ...professional, experience: 7 }, 'a');
  const own = (await adapter.getWorkspace(therapist('a'))).notifications;
  await adapter.markNotificationsRead(therapist('a'), own[0].id);
  let notifications = (await create().getWorkspace(therapist('a'))).notifications;
  assert.equal(notifications[0].isRead, true);
  assert.equal(notifications[1].isRead, false);
  for (const actor of [therapist('b'), center]) {
    await assert.rejects(adapter.markNotificationsRead(actor, own[0].id), { code: 'notFound' });
  }
  await assert.rejects(adapter.markNotificationsRead(therapist('a'), 'center-only'), { code: 'notFound' });
  await assert.rejects(adapter.markNotificationsRead({ ...therapist('a'), centerId: 'other' }), { code: 'forbidden' });
  await assert.rejects(adapter.markNotificationsRead({ role: 'patient', centerId: 'clinic' }), { code: 'forbidden' });
  assert.doesNotThrow(() => authorizeCenterOperation({ role: 'patient' }, 'markNotificationsRead'));
  assert.throws(() => authorizeCenterOperation({ role: 'patient' }, 'getWorkspace'), { code: 'forbidden' });
  assert.doesNotThrow(() => authorizeCenterOperation(therapist('a'), 'markNotificationsRead'));
  await adapter.markNotificationsRead(therapist('a'));
  notifications = (await create().getWorkspace(therapist('a'))).notifications;
  assert.ok(notifications.every(item => item.isRead));
  assert.equal(read().notifications[0].isRead, false);
  assert.equal((await adapter.getWorkspace(therapist('b'))).notifications[0].isRead, false);
  await adapter.markNotificationsRead(center);
  assert.equal(read().notifications[0].isRead, true);
});

test('message alerts use incoming records and stable IDs; later messages stay unread', async () => {
  const { adapter, create, update } = setup();
  let own = (await adapter.getWorkspace(therapist('a'))).notifications;
  assert.equal(own.length, 1);
  assert.equal(own[0].id, 'message:c-a:in-a');
  assert.deepEqual(own[0].target, { kind: 'conversation', id: 'c-a' });
  await adapter.markNotificationsRead(therapist('a'));
  assert.equal((await create().getWorkspace(therapist('a'))).notifications[0].isRead, true);
  // An incoming record supplied by the messaging data boundary.
  update(state => {
    state.conversations[0].unreadCount = 2;
    state.conversations[0].messages.push({ id: 'new', direction: 'incoming', sentAt: '2030-01-10T13:00:00Z' });
  });
  adapter.reload();
  own = (await adapter.getWorkspace(therapist('a'))).notifications;
  assert.equal(own.filter(item => !item.isRead).length, 1);
  await adapter.markConversationRead(therapist('a'), 'c-a');
  const afterReading = await adapter.getWorkspace(therapist('a'));
  assert.equal(afterReading.conversations[0].unreadCount, 0);
  assert.equal(afterReading.notifications.length, 2);
  assert.equal(afterReading.notifications.filter(item => !item.isRead).length, 1);
  assert.equal((await adapter.getWorkspace(therapist('b'))).notifications.length, 1);
});

test('storage failure rolls back both the business change and notification/receipt', async () => {
  const { adapter, read, fail } = setup();
  const before = read();
  fail();
  await assert.rejects(adapter.saveTherapist(center, { ...professional, experience: 7 }, 'a'), { code: 'storageUnavailable' });
  const own = await adapter.getWorkspace(therapist('a'));
  assert.equal(own.therapists[0].experience, 5);
  assert.equal(own.notifications.length, 1);
  await assert.rejects(adapter.markNotificationsRead(therapist('a')), { code: 'storageUnavailable' });
  assert.equal((await adapter.getWorkspace(therapist('a'))).notifications[0].isRead, false);
  assert.deepEqual(read(), before);
});
