import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockCenterAdapter } from '../../services/center/mockCenterAdapter.js';
import { normalizeTherapistServices } from '../../services/center/therapistRecords.js';

const center = { role: 'center', centerId: 'clinic' };
const therapist = { role: 'physiotherapist', centerId: 'clinic', therapistId: 't1' };
const patient = { role: 'patient', centerId: 'clinic', patientId: 'p1' };
const professional = { specialty: 'Manual', specialtyAr: '', experience: 4, availability: 'available' };
const personal = { name: 'Updated Therapist', phone: '0591234567', about: 'Care' };
const service = { name: 'Manual', description: 'Care', price: 25, duration: 45 };
const profile = { name: 'Clinic', email: 'clinic@example.com', phone: '0591234567', address: 'Clinic street' };

function setup() {
  let saved = {
    today: '2030-01-10',
    center: { id: 'clinic', name: { en: 'Clinic' }, gallery: [] },
    therapists: [{ id: 't1', centerId: 'clinic', name: { en: 'Therapist' }, email: 'staff@example.com', phone: '0591234567', specialty: { en: 'Manual' }, experience: 4, availability: 'available' }],
    patients: [{ id: 'p1', name: { en: 'Patient' }, email: 'patient@example.com', phone: '0591234567', status: 'active', notes: [] }],
    services: [{ id: 's1', name: { en: 'Manual' }, price: 25, duration: 45, status: 'active' }],
    appointments: [], reviews: [{ id: 'r1', rating: 5 }],
    notifications: [{ id: 'n1', isRead: false }], notificationPreferences: {},
    conversations: [{ id: 'c1', patientId: 'p1', therapistId: 't1', unreadCount: 0, messages: [] }],
  };
  let fail = false;
  const store = {
    read: () => structuredClone(saved),
    write: value => {
      if (fail) throw Object.assign(new Error('storageUnavailable'), { code: 'storageUnavailable' });
      saved = structuredClone(value);
    },
  };
  const create = () => createMockCenterAdapter(store.read(), { store, now: () => new Date('2030-01-10T08:00:00Z') });
  return { create, read: store.read, fail: () => { fail = true; } };
}

test('stale Center and therapist mutations retain newer messages, attachments and both read states', async () => {
  const cases = [
    a => a.savePatient(center, { name: 'Patient updated', email: 'patient@example.com', phone: '0591234567', status: 'active' }, 'p1'),
    a => a.saveTherapist(center, { ...professional, experience: 5 }, 't1'),
    a => a.saveOwnProfile(therapist, personal),
    a => a.saveService(center, { ...service, price: 30 }, 's1'),
    a => a.saveCenter(center, profile),
    a => a.updateCenterImages(center, { add: ['/clinic.webp'] }),
    a => a.saveNotificationPreferences(center, { reviews: true }),
    a => a.updateReview(center, 'r1', { reply: 'Thank you' }),
    a => a.addPatientNote(center, 'p1', 'Care note'),
    a => a.saveAppointment(center, { patientId: 'p1', therapistId: 't1', serviceId: 's1', date: '2030-01-11', time: '10:00' }),
    a => a.requestAppointment(patient, { patientId: 'p1', therapistId: 't1', serviceId: 's1', date: '2030-01-11', time: '10:00' }),
    a => a.markNotificationsRead(center),
  ];
  for (const save of cases) {
    const { create, read } = setup();
    const stale = create(), current = create(); // No reload/storage event delivered.
    const file = new File(['notes'], 'notes.pdf', { type: 'application/pdf' });
    const sent = await current.sendMessage(patient, 'c1', { text: 'Question', clientId: 'one', attachments: [{ name: file.name, sourceFile: file }] });
    await current.markConversationRead(therapist, 'c1', [sent.id]);
    await current.markNotificationsRead(therapist, `message:c1:${sent.id}`);
    const conversations = read().conversations;
    const receipts = read().therapistNotificationReadIds;
    await save(stale);
    assert.deepEqual(read().conversations, conversations);
    assert.deepEqual(read().therapistNotificationReadIds, receipts);
    const inbox = await current.getMessagingWorkspace(therapist);
    assert.equal(inbox.conversations[0].unreadCount, 0);
    assert.equal(inbox.notifications.filter(n => n.id.endsWith(sent.id)).length, 1);
    assert.equal(inbox.notifications.find(n => n.id.endsWith(sent.id)).isRead, true);
    const reply = await stale.sendMessage(therapist, 'c1', { text: 'Reply', clientId: 'reply' });
    assert.equal((await current.getMessagingWorkspace(patient)).conversations[0].messages.at(-1).id, reply.id);
  }
});

test('async gallery preparation refreshes state again after another writer sends a message', async () => {
  const { create, read } = setup();
  const stale = create(), other = create();
  let finish;
  stale.prepareImage = () => new Promise(resolve => { finish = resolve; });
  const pending = stale.addGalleryImage(center, {});
  const sent = await other.sendMessage(patient, 'c1', { text: 'While reading image' });
  await other.updateCenterImages(center, { add: ['/other.webp'] });
  finish('/new.webp');
  await pending;
  assert.equal(read().conversations[0].messages[0].id, sent.id);
  assert.deepEqual(read().center.gallery, ['/other.webp', '/new.webp']);
});

test('stale personal/professional edits preserve each other and failed storage preserves latest messages', async () => {
  const { create, read, fail } = setup();
  const personalTab = create(), professionalTab = create();
  await professionalTab.saveTherapist(center, { ...professional, experience: 9 }, 't1');
  await personalTab.saveOwnProfile(therapist, personal);
  await professionalTab.saveTherapist(center, { ...professional, experience: 10 }, 't1');
  assert.equal(read().therapists[0].name.en, personal.name);
  assert.equal(read().therapists[0].experience, 10);
  await personalTab.sendMessage(patient, 'c1', { text: 'Keep this' });
  const before = read();
  fail();
  await assert.rejects(professionalTab.saveOwnProfile(therapist, personal), { code: 'storageUnavailable' });
  assert.deepEqual(read(), before);
  assert.equal((await professionalTab.getMessagingWorkspace(patient)).conversations[0].messages.length, 1);
});

test('legacy service migration is idempotent and persisted IDs survive both catalog and specialty renames', async () => {
  const { create, read } = setup();
  const adapter = create();
  await adapter.saveService(center, { ...service, name: 'Renamed', nameAr: 'New Arabic', price: 40, duration: 60 }, 's1');
  await adapter.saveTherapist(center, { ...professional, specialty: 'Different profession', specialtyAr: 'Different Arabic' }, 't1');
  const own = await create().getWorkspace(therapist);
  assert.deepEqual(own.therapists[0].serviceIds, ['s1']);
  assert.equal(own.services[0].id, 's1');
  assert.equal(own.services[0].price, 40);
  assert.equal(own.services[0].duration, 60);
  const before = read();
  normalizeTherapistServices(before);
  normalizeTherapistServices(before);
  assert.deepEqual(before, read());
  assert.equal(typeof adapter.deleteService, 'undefined');
});

test('new specialty does not grant assignments; only Center may explicitly assign valid catalog IDs', async () => {
  const { create, read } = setup();
  const adapter = create();
  const added = await adapter.saveTherapist(center, { ...professional, name: 'New Staff', email: 'new@example.com', phone: '0591234567' });
  assert.deepEqual(added.serviceIds, []);
  await adapter.saveTherapist(center, { ...professional, serviceIds: ['s1', 's1'] }, added.id);
  assert.deepEqual(read().therapists.find(t => t.id === added.id).serviceIds, ['s1']);
  await assert.rejects(adapter.saveTherapist(center, { ...professional, serviceIds: ['unknown'] }, added.id), { code: 'validation' });
  await assert.rejects(adapter.saveTherapist(therapist, { ...professional, serviceIds: ['s1'] }, 't1'), { code: 'forbidden' });
  await assert.rejects(adapter.saveOwnProfile(therapist, { ...personal, serviceIds: [] }), { code: 'forbidden' });
  await adapter.saveTherapist(center, { ...professional, serviceIds: [] }, added.id);
  await adapter.saveService(center, service, 's1');
  assert.deepEqual(read().therapists.find(t => t.id === added.id).serviceIds, []);
});

test('patient requests reject a mismatched Center without mutating the workspace', async () => {
  const { create, read } = setup();
  const before = read();
  await assert.rejects(create().requestAppointment({ ...patient, centerId: 'other' }, { patientId: 'p1' }), { code: 'forbidden' });
  assert.deepEqual(read(), before);
});
