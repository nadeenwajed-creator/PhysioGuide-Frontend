import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockCenterAdapter } from '../../services/center/mockCenterAdapter.js';
import { createMockAuthAdapter } from '../../services/auth/mockAuthAdapter.js';
import { MOCK_PASSWORD } from '../../services/auth/mockAccounts.js';
import {
  assignedTherapistServices,
  therapistServicePrices,
} from '../../services/center/therapistRecords.js';

const owner = { id: 'owner', role: 'center', centerId: 'clinic' };
const staff = {
  id: 'staff:t1',
  role: 'physiotherapist',
  centerId: 'clinic',
  therapistId: 't1',
};
const personal = {
  name: 'Updated Name',
  nameAr: 'اسم محدث',
  phone: '0591234567',
  about: 'Individual care.',
  aboutAr: '',
  imageUrl: '/portrait.webp',
};
const professional = {
  specialty: 'Manual Therapy',
  specialtyAr: '',
  experience: 8,
  availability: 'available',
};
function setup() {
  let saved = {
    center: { id: 'clinic', name: { en: 'Clinic' } },
    today: '2030-01-10',
    therapists: ['t1', 't2'].map((id) => ({
      id,
      centerId: 'clinic',
      name: { en: id },
      email: `${id}@example.com`,
      phone: '0591234567',
      about: { en: '' },
      specialty: { en: 'Manual Therapy' },
      serviceIds: ['s1'],
      experience: 3,
      availability: 'available',
      price: 999,
    })),
    services: [
      {
        id: 's1',
        name: { en: 'Manual Therapy' },
        price: 25,
        duration: 45,
        status: 'active',
      },
      { id: 's2', name: { en: 'Sports' }, price: 35, duration: 60 },
    ],
    patients: [],
    appointments: [],
    conversations: [],
    notifications: [],
    reviews: [],
  };
  let failed = false;
  const store = {
    read: () => structuredClone(saved),
    write: (value) => {
      if (failed) throw Object.assign(new Error(), { code: 'storageUnavailable' });
      saved = structuredClone(value);
    },
  };
  const create = () => createMockCenterAdapter(store.read(), { store });
  return {
    adapter: create(),
    create,
    read: store.read,
    fail: () => {
      failed = true;
    },
  };
}

test('personal saves target the signed-in therapist and preserve professional/login fields', async () => {
  const { adapter, read, create } = setup();
  const original = read().therapists;
  await adapter.saveOwnProfile(staff, personal);
  const saved = (await create().getWorkspace(owner)).therapists;
  assert.equal(saved[0].name.en, personal.name);
  assert.equal(saved[0].imageUrl, personal.imageUrl);
  assert.equal(saved[0].email, original[0].email);
  assert.deepEqual(saved[0].specialty, original[0].specialty);
  assert.equal(saved[0].price, 999); // Legacy storage survives; it is never used for pricing.
  assert.deepEqual(saved[1], original[1]);
  for (const values of [
    { ...personal, email: 'other@example.com' },
    { ...personal, experience: 99 },
    { ...personal, price: 1 },
    { ...personal, therapistId: 't2' },
    { ...personal, serviceIds: ['s2'] },
  ]) {
    await assert.rejects(adapter.saveOwnProfile(staff, values), { code: 'forbidden' });
  }
  for (const actor of [
    owner,
    { ...staff, role: 'patient' },
    { ...staff, centerId: 'other' },
  ]) {
    await assert.rejects(adapter.saveOwnProfile(actor, personal), { code: 'forbidden' });
  }
});

test('center edits accept professional fields only, with no personal or price mutation', async () => {
  const { adapter, read } = setup();
  const original = read().therapists[0];
  await adapter.saveTherapist(owner, professional, 't1');
  assert.equal(read().therapists[0].experience, 8);
  assert.deepEqual(read().therapists[0].name, original.name);
  for (const key of ['name', 'nameAr', 'phone', 'email', 'imageUrl', 'about', 'price']) {
    await assert.rejects(
      adapter.saveTherapist(owner, { ...professional, [key]: 'changed' }, 't1'),
      { code: 'forbidden' },
    );
  }
  await assert.rejects(adapter.saveTherapist(staff, professional, 't1'), {
    code: 'forbidden',
  });
  await assert.rejects(
    adapter.saveTherapist({ ...owner, centerId: 'other' }, professional, 't1'),
    { code: 'forbidden' },
  );
});

test('new staff records provide stable linked login identities without stored passwords', async () => {
  const { adapter, read } = setup();
  const record = await adapter.saveTherapist(owner, {
    ...professional,
    name: 'New Staff',
    nameAr: '',
    email: 'new-staff@example.com',
    phone: '0591234567',
  });
  const auth = createMockAuthAdapter({
    delay: 0,
    getTherapists: () => read().therapists,
  });
  const session = (
    await auth.loginCenter({ email: record.email, password: MOCK_PASSWORD })
  ).session;
  assert.equal(session.id, `staff:${record.id}`);
  assert.equal(session.therapistId, record.id);
  assert.equal(session.centerId, owner.centerId);
  assert.equal(session.role, 'physiotherapist');
  assert.equal(Object.hasOwn(record, 'password'), false);
  assert.equal(Object.hasOwn(record, 'price'), false);
  await adapter.saveOwnProfile(session, personal);
  assert.equal((await auth.restoreSession()).name.en, personal.name);
  await assert.rejects(
    adapter.saveTherapist(owner, {
      ...professional,
      name: 'Duplicate',
      email: record.email,
      phone: '0591234567',
    }),
    { code: 'duplicateEmail' },
  );
});

test('assigned services and prices follow live service records, including legacy and empty assignments', async () => {
  const { adapter, read } = setup();
  assert.deepEqual(therapistServicePrices(read().therapists[0], read().services), [25]);
  await adapter.saveService(
    owner,
    { name: 'Manual Therapy', description: 'Session', price: 47, duration: 50 },
    's1',
  );
  const own = await adapter.getWorkspace(staff);
  assert.equal(own.services[0].price, 47);
  assert.equal(own.services[0].duration, 50);
  assert.equal(own.therapists.length, 1);
  assert.equal(own.therapists[0].id, 't1');
  assert.equal('appointments' in own, false);
  assert.deepEqual(assignedTherapistServices({ serviceIds: [] }, read().services), []);
  assert.deepEqual(
    assignedTherapistServices({ specialty: { en: 'Unknown' } }, read().services),
    [],
  );
  assert.deepEqual(
    assignedTherapistServices(
      { serviceIds: ['s2', 'missing'], specialty: { en: 'Manual Therapy' } },
      read().services,
    ).map((item) => item.id),
    ['s2'],
  );
});

test('profile validation and failed persistence leave the saved profile intact', async () => {
  const { adapter, read, fail } = setup();
  const original = read();
  for (const values of [
    { ...personal, name: '' },
    { ...personal, phone: 'x' },
    { ...personal, about: 'x'.repeat(501) },
  ]) {
    await assert.rejects(adapter.saveOwnProfile(staff, values), { code: 'validation' });
  }
  await assert.rejects(
    adapter.saveOwnProfile(staff, { ...personal, imageUrl: 'javascript:alert(1)' }),
    { code: 'image' },
  );
  assert.deepEqual(read(), original);
  fail();
  await assert.rejects(adapter.saveOwnProfile(staff, personal), {
    code: 'storageUnavailable',
  });
  assert.deepEqual((await adapter.getWorkspace(owner)).therapists, original.therapists);
});
