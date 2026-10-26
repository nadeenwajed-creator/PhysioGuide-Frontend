import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCenter, availableSlots, patientIdentity } from '../../services/patient/discoveryModel.js';
const fixture = () => ({
  center: {
    id: 'c',
    name: {
      en: 'Center'
    },
    hours: {
      weekStart: '09:00',
      weekEnd: '12:00',
      fridayStart: '10:00',
      fridayEnd: '12:00'
    }
  },
  services: [{
    id: 's',
    status: 'active',
    price: 70,
    duration: 60
  }, {
    id: 'hidden',
    status: 'inactive',
    price: 10,
    duration: 30
  }],
  therapists: [{
    id: 't',
    availability: 'available',
    serviceIds: ['s'],
    email: 'private@example.com',
    price: 999
  }],
  patients: [{
    id: 'p',
    name: 'Patient',
    notes: ['private'],
    email: 'private@example.com'
  }],
  appointments: [],
  reviews: [{
    id: 'r',
    patientId: 'p',
    rating: 4,
    text: 'Visible'
  }, {
    id: 'x',
    rating: 1,
    status: 'hidden'
  }],
  conversations: [{
    messages: ['private']
  }]
});
test('Public projection excludes private records, inactive services and hidden reviews', () => {
  const view = publicCenter(fixture());
  assert.equal(view.services.length, 1);
  assert.equal(view.services[0].price, 70);
  assert.equal(view.rating, 4);
  assert.equal(view.reviews.length, 1);
  for (const key of ['patients', 'appointments', 'conversations']) assert.equal(view[key], undefined);
  assert.equal(view.therapists[0].email, undefined);
  assert.equal(view.therapists[0].price, undefined);
});
test('Stable patient identity does not infer identities from email', () => {
  assert.equal(patientIdentity({
    id: 'a',
    patientId: 'p'
  }), 'p');
  assert.equal(patientIdentity({
    id: 'b'
  }), 'patient-account-b');
});
test('Slots follow center hours, service duration and assigned therapist', () => {
  const w = fixture();
  const options = {
    therapistId: 't',
    serviceId: 's',
    patientId: 'p',
    date: '2030-01-07'
  };
  const now = new Date('2029-01-01');
  assert.deepEqual(availableSlots(w, options, now), ['09:00', '09:30', '10:00', '10:30', '11:00']);
  assert.deepEqual(availableSlots(w, {
    ...options,
    serviceId: 'hidden'
  }, now), []);
  w.therapists[0].serviceIds = [];
  assert.deepEqual(availableSlots(w, options, now), []);
});
test('Pending and confirmed overlaps block slots; cancelled records do not', () => {
  const w = fixture();
  const options = {
    therapistId: 't',
    serviceId: 's',
    patientId: 'p',
    date: '2030-01-07'
  };
  const now = new Date('2029-01-01');
  w.appointments = [{
    id: 'appointment',
    ...options,
    time: '09:30',
    status: 'pending',
    durationMinutes: 60
  }];
  assert.deepEqual(availableSlots(w, options, now), ['10:30', '11:00']);
  w.appointments[0].status = 'cancelled';
  assert.equal(availableSlots(w, options, now).length, 5);
});
test('No hours or unavailable therapist yields no fabricated slots', () => {
  const w = fixture();
  const options = {
    therapistId: 't',
    serviceId: 's',
    date: '2030-01-07'
  };
  w.center.hours = null;
  assert.deepEqual(availableSlots(w, options), []);
});
test('Invalid calendar dates and inactive therapists are not bookable', () => {
  const workspace = fixture();
  const request = {therapistId: 't', serviceId: 's', date: '2030-02-31'};
  assert.deepEqual(availableSlots(workspace, request, new Date('2029-01-01')), []);
  workspace.therapists[0].status = 'inactive';
  assert.deepEqual(availableSlots(workspace, {...request, date: '2030-01-07'}, new Date('2029-01-01')), []);
});
