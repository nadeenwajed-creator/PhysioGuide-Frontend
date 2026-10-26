import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockCenterAdapter } from '../../services/center/mockCenterAdapter.js';
import { authorizeCenterOperation } from '../../services/center/access.js';
import { createBrowserStore } from '../../services/mock/browserStore.js';
import { ServiceError } from '../../services/api/serviceError.js';
import { locateCenterDevice, centerMapLinks, hasSavedCenterLocation, createCenterAddressSearch } from '../../services/centerLocationService.js';

const actor = { id: 'owner', role: 'center', centerId: 'clinic' };
const hours = { weekStart: '09:00', weekEnd: '18:00', fridayStart: '10:00', fridayEnd: '14:00' };
const profile = { name: 'Clinic', nameAr: 'المركز', email: 'clinic@example.com', phone: '0591234567', address: 'Clinic Street', about: 'Care', imageUrl: '' };
function setup() {
  const seed = {
    today: '2030-01-10', center: { id: 'clinic', name: { en: 'Clinic' }, hours, gallery: [], coordinates: { latitude: 32, longitude: 35 } },
    patients: [], therapists: [], services: [], appointments: [], conversations: [], notifications: [],
    reviews: [{ id: 'r1', rating: 5, reply: '' }],
    notificationPreferences: { appointments: false, patients: true, reviews: true, futureCategory: false },
  };
  const memory = new Map();
  let failed = false;
  const storage = { getItem: key => memory.get(key), setItem: (key, value) => { if (failed) throw new Error(); memory.set(key, value); } };
  const store = createBrowserStore('test-center', { storage: () => storage });
  store.write(seed);
  const create = () => createMockCenterAdapter(seed, { store, now: () => new Date(2030, 0, 10, 12) });
  return { create, adapter: create(), store, memory, failWrites: () => { failed = true; } };
}

test('remaining mutations enforce Center roles and workspace ownership', async () => {
  const { adapter } = setup();
  const operations = [
    ['saveTherapist', {}], ['saveService', {}], ['updateCenterImages', { add: ['/photo.webp'] }],
    ['updateReview', 'r1', { reply: 'Reply' }], ['saveCenter', profile],
    ['saveNotificationPreferences', { reviews: false }], ['changeCenterPassword', {}],
  ];
  for (const [method, ...args] of operations) {
    assert.doesNotThrow(() => authorizeCenterOperation(actor, method));
    for (const role of ['patient', 'physiotherapist', 'admin']) {
      assert.throws(() => authorizeCenterOperation({ ...actor, role }, method), { code: 'forbidden' });
      await assert.rejects(adapter[method]({ ...actor, role }, ...args), { code: 'forbidden' });
    }
    await assert.rejects(adapter[method]({ ...actor, centerId: 'other-clinic' }, ...args), { code: 'forbidden' });
  }
});

test('therapist and service edits persist with stable identities', async () => {
  const { adapter, create } = setup();
  const therapist = { name: 'Therapist', email: 'staff@example.com', phone: '0591234568', specialty: 'Rehabilitation', experience: 3, availability: 'available' };
  const saved = await adapter.saveTherapist(actor, therapist);
  await adapter.saveTherapist(actor, { specialty: 'Updated specialty', experience: 4, availability: 'unavailable' }, saved.id);
  await assert.rejects(adapter.saveTherapist(actor, therapist), { code: 'duplicateEmail' });
  const service = { name: 'Session', description: 'Physiotherapy', price: 25, duration: 45 };
  const added = await adapter.saveService(actor, service);
  await adapter.saveService(actor, { ...service, duration: 60 }, added.id);
  const data = await create().getWorkspace(actor);
  assert.equal(data.therapists.length, 1);
  assert.equal(data.therapists[0].name.en, 'Therapist');
  assert.equal(data.therapists[0].specialty.en, 'Updated specialty');
  assert.equal(data.therapists[0].experience, 4);
  assert.equal(data.therapists[0].availability, 'unavailable');
  assert.equal(data.services[0].duration, 60);
  assert.equal(data.services[0].id, added.id);
});

test('reply editing replaces one persisted response without changing ratings', async () => {
  const { adapter, create, store } = setup();
  await adapter.updateReview(actor, 'r1', { reply: ' First reply ' });
  await create().updateReview(actor, 'r1', { reply: 'Edited reply' });
  assert.deepEqual(store.read().reviews, [{ id: 'r1', rating: 5, reply: 'Edited reply' }]);
  await assert.rejects(adapter.updateReview(actor, 'r1', { reply: ' ' }), { code: 'required' });
  await assert.rejects(adapter.updateReview(actor, 'missing', { reply: 'Reply' }), { code: 'notFound' });
});

test('preferences retain patient and unknown keys across new and legacy saves', async () => {
  const { adapter, create, store } = setup();
  await adapter.saveNotificationPreferences(actor, { appointments: true, appointmentChanges: false, reviews: false });
  assert.deepEqual(store.read().notificationPreferences, { appointments: true, patients: true, reviews: false, futureCategory: false, appointmentChanges: false });
  await create().saveNotificationPreferences(actor, { appointments: false, patients: false, reviews: true });
  const expected = { appointments: false, patients: false, reviews: true, futureCategory: false, appointmentChanges: false };
  assert.deepEqual(store.read().notificationPreferences, expected);
  for (const value of [null, [], {}, { reviews: 'false' }, { appointmentChanges: null }]) {
    await assert.rejects(create().saveNotificationPreferences(actor, value), { code: 'validation' });
    assert.deepEqual(store.read().notificationPreferences, expected);
  }
});

test('profile save preserves omitted hours and clears explicit null hours', async () => {
  const { adapter, store } = setup();
  assert.equal(await adapter.saveCenter(actor, profile), undefined);
  assert.deepEqual(store.read().center.hours, hours);
  await adapter.saveCenter(actor, { ...profile, name: 'Updated clinic', hours: null });
  assert.equal(store.read().center.hours, null);
  assert.equal(store.read().center.name.en, 'Updated clinic');
  await adapter.saveCenter(actor, profile);
  assert.equal(store.read().center.hours, null);
  for (const invalid of [false, '', {}, { ...hours, weekEnd: '08:00' }]) {
    await assert.rejects(adapter.saveCenter(actor, { ...profile, hours: invalid }), { code: 'hours' });
    assert.equal(store.read().center.hours, null);
  }
});

test('coordinates require confirmation and support explicit clearing without losing legacy values', async () => {
  const { adapter, store } = setup();
  await adapter.saveCenter(actor, profile);
  assert.deepEqual(store.read().center.coordinates, { latitude: 32, longitude: 35 });
  for (const coordinates of [{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: NaN }, { latitude: '32', longitude: 35 }]) {
    await assert.rejects(adapter.saveCenter(actor, { ...profile, coordinates, locationConfirmed: true }), { code: 'validation' });
  }
  const coordinates = { latitude: 0, longitude: 0 };
  await assert.rejects(adapter.saveCenter(actor, { ...profile, coordinates }), error => error.fields.coordinates === 'confirmLocation');
  await adapter.saveCenter(actor, { ...profile, coordinates, locationConfirmed: true });
  assert.deepEqual(store.read().center.coordinates, coordinates);
  assert.equal(store.read().center.locationConfirmed, true);
  await adapter.saveCenter(actor, { ...profile, coordinates: null });
  assert.equal(store.read().center.coordinates, null);
  assert.equal(store.read().center.locationConfirmed, false);
});

test('gallery is deduplicated and invalid galleries/uploads do not mutate stored data', async () => {
  const { adapter, store } = setup();
  await adapter.saveCenter(actor, { ...profile, gallery: ['/one.webp', '/one.webp', '/two.webp'] });
  assert.deepEqual(store.read().center.gallery, ['/one.webp', '/two.webp']);
  for (const gallery of [null, 'image', [''], [' '], [null]]) {
    await assert.rejects(adapter.saveCenter(actor, { ...profile, gallery }), { code: 'image' });
  }
  for (const file of [null, { type: 'text/html', size: 10 }, { type: 'image/png', size: 6 * 1024 * 1024 }]) {
    await assert.rejects(adapter.prepareImage(file), { code: 'image' });
  }
  assert.deepEqual(store.read().center.gallery, ['/one.webp', '/two.webp']);
});

test('storage failure rolls back remaining mutations without success notifications', async () => {
  for (const mutate of [
    adapter => adapter.updateReview(actor, 'r1', { reply: 'Reply' }),
    adapter => adapter.saveCenter(actor, { ...profile, hours: null, gallery: ['/photo.webp'] }),
    adapter => adapter.saveNotificationPreferences(actor, { appointmentChanges: false }),
  ]) {
    const { adapter, store, failWrites } = setup();
    const before = await adapter.getWorkspace(actor);
    let notifications = 0;
    adapter.subscribe(() => { notifications++; });
    failWrites();
    await assert.rejects(mutate(adapter), ServiceError);
    assert.deepEqual(await adapter.getWorkspace(actor), before);
    assert.equal(notifications, 0);
    assert.equal(store.read().center.hours.weekStart, '09:00');
  }
});

test('password operation remains unavailable and never writes credentials', async () => {
  const { adapter, memory } = setup();
  const before = [...memory.entries()];
  await assert.rejects(adapter.changeCenterPassword(actor, { currentPassword: 'old-value', newPassword: 'new-value' }), { code: 'passwordUnavailable' });
  assert.deepEqual([...memory.entries()], before);
});

test('location wrapper preserves accuracy and errors; maps use supplied coordinates', async () => {
  const coordinates = { latitude: 32.2, longitude: 35.2 };
  const location = await locateCenterDevice({ getCurrentPosition: success => success({ coords: { ...coordinates, accuracy: 150 } }) });
  assert.deepEqual(location, { coordinates, accuracy: 150 });
  await assert.rejects(locateCenterDevice(null), { code: 'unsupported' });
  await assert.rejects(locateCenterDevice({ getCurrentPosition: (success, error) => error({ code: 1 }) }), { code: 'denied' });
  const links = centerMapLinks(coordinates);
  assert.equal(new URL(links.page).searchParams.get('mlat'), '32.2');
  assert.equal(new URL(links.embed).searchParams.get('marker'), '32.2,35.2');
});


test('profile image actions persist independently and preserve other profile fields', async () => {
  const { adapter, create, store } = setup();
  await adapter.updateCenterImages(actor, { add: ['/one.webp', '/one.webp'], imageUrl: '/cover.webp' });
  await create().updateCenterImages(actor, { add: ['/two.webp'] });
  await create().updateCenterImages(actor, { remove: '/one.webp' });
  await create().saveCenter(actor, profile);
  assert.deepEqual(store.read().center.gallery, ['/two.webp']);
  assert.equal(store.read().center.imageUrl, '/cover.webp');
  assert.deepEqual(store.read().center.hours, hours);
  for (const values of [{}, { imageUrl: '' }, { add: [null] }, { remove: '/missing.webp' }]) {
    await assert.rejects(create().updateCenterImages(actor, values));
  }
  assert.deepEqual(store.read().center.gallery, ['/two.webp']);
  assert.equal(typeof adapter.deleteService, 'undefined');
  assert.throws(() => authorizeCenterOperation(actor, 'deleteService'), { code: 'forbidden' });
});

test('image writes roll back on storage failure', async () => {
  const { adapter, failWrites } = setup();
  const before = await adapter.getWorkspace(actor);
  failWrites();
  await assert.rejects(adapter.updateCenterImages(actor, { add: ['/photo.webp'] }), ServiceError);
  assert.deepEqual(await adapter.getWorkspace(actor), before);
});

test('legacy registration pins display while missing, invalid or explicitly unconfirmed pins do not', () => {
  const coordinates = { latitude: 32.22, longitude: 35.26 };
  assert(hasSavedCenterLocation({ coordinates }));
  assert(hasSavedCenterLocation({ coordinates, locationConfirmed: true }));
  assert(!hasSavedCenterLocation({ coordinates, locationConfirmed: false }));
  assert(!hasSavedCenterLocation({ coordinates: null }));
  assert(!hasSavedCenterLocation({ coordinates: { latitude: 95, longitude: 35 } }));
});

test('address search maps provider results, rejects broad/invalid pins and normalizes errors', async () => {
  let requested;
  const search = createCenterAddressSearch({ apiKey: 'synthetic-test-key', fetcher: async url => {
    requested = new URL(url);
    return { ok: true, json: async () => ({ results: [
      { formatted: 'Clinic street', lat: 32.2, lon: 35.2, result_type: 'amenity' },
      { formatted: 'Country', lat: 32, lon: 35, result_type: 'country' },
      { formatted: 'Invalid', lat: 99, lon: 0 },
    ] }) };
  } });
  assert.deepEqual(await search('Clinic', { language: 'ar' }), [{ address: 'Clinic street', coordinates: { latitude: 32.2, longitude: 35.2 } }]);
  assert.equal(requested.searchParams.get('lang'), 'ar');
  assert.equal(requested.searchParams.get('text'), 'Clinic');
  await assert.rejects(createCenterAddressSearch()('Clinic'), { code: 'lookupUnavailable' });
  await assert.rejects(createCenterAddressSearch({ apiKey: 'test', fetcher: async () => ({ ok: false, status: 429 }) })('Clinic'), { code: 'lookupUnavailable' });
  await assert.rejects(createCenterAddressSearch({ apiKey: 'test', fetcher: async () => { throw new Error('private URL'); } })('Clinic'), error => error.code === 'lookupFailed' && !error.message.includes('private'));
});
