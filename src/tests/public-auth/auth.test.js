import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCenterLocationService, createGeoapifyReverseGeocoder } from '../../services/auth/centerLocation.js';
import { createAuthRequest, validateAuthForm } from '../../utils/authValidation.js';
import { createMockAuthAdapter } from '../../services/auth/mockAuthAdapter.js';

const coordinates = { latitude: 31.9, longitude: 35.2 };
const values = {
  name: 'Example center', email: ' example@example.com ', phone: '+970 599 123 456',
  location: 'Example address', password: ' example-password ', confirmPassword: ' example-password ',
};

test('center requests keep coordinates separate from the readable address', () => {
  const request = createAuthRequest(values, { role: 'center', mode: 'signup' }, coordinates);
  assert.deepEqual(request.location, { address: 'Example address', coordinates });
  assert.equal(request.password, values.password);
  assert.equal(request.email, 'example@example.com');
  assert.equal('confirmPassword' in request, false);
});

test('signup validates required fields, address, passwords, and Arabic phone digits', () => {
  const context = { role: 'center', mode: 'signup' };
  assert.deepEqual(validateAuthForm({ ...values, phone: '٠٥٩٩١٢٣٤٥٦' }, context), {});
  assert.equal(validateAuthForm({ ...values, location: '' }, context).location, 'required');
  assert.equal(validateAuthForm({ ...values, confirmPassword: 'different' }, context).confirmPassword, 'passwordMismatch');
  assert.equal(validateAuthForm({ ...values, phone: 'abc' }, context).phone, 'phone');
  assert.equal(Object.keys(validateAuthForm({}, context)).length, 6);
});

test('login does not apply the signup password length rule', () => {
  assert.deepEqual(validateAuthForm({ email: 'a@example.com', password: 'short' }, { role: 'patient', mode: 'login' }), {});
});

test('mock authentication cannot return a real authenticated session', async () => {
  const adapter = createMockAuthAdapter({ delay: 0 });
  assert.deepEqual(await adapter.loginPatient(values), { mode: 'demo', status: 'validated', role: 'patient' });
  assert.deepEqual(await adapter.registerCenter(values), { mode: 'demo', status: 'not-created', role: 'center' });
});

test('location captures coordinates and leaves lookup unavailable without a provider', async () => {
  const service = createCenterLocationService();
  let options;
  const result = await service.getCoordinates({ getCurrentPosition(success, failure, config) {
    options = config;
    success({ coords: coordinates });
  } });
  assert.deepEqual(result, coordinates);
  assert.equal(options.timeout, 10000);
  assert.equal(await service.getAddress(result), null);
});

test('location errors distinguish permission denial, unavailable position, and timeout', async () => {
  const service = createCenterLocationService();
  for (const [code, expected] of [[1, 'denied'], [2, 'failed'], [3, 'timeout']]) {
    await assert.rejects(service.getCoordinates({ getCurrentPosition(success, failure) { failure({ code }); } }), { code: expected });
  }
  await assert.rejects(service.getCoordinates(null), { code: 'unsupported' });
});

test('an injected lookup receives coordinates, language, and cancellation', async () => {
  const controller = new AbortController();
  const service = createCenterLocationService({ reverseGeocode: async (point, options) => {
    assert.deepEqual(point, coordinates);
    assert.equal(options.language, 'ar');
    assert.equal(options.signal, controller.signal);
    return ' Example readable address ';
  } });
  assert.equal(await service.getAddress(coordinates, { language: 'ar', signal: controller.signal }), 'Example readable address');
  const failing = createCenterLocationService({ reverseGeocode: async () => { throw new Error('Lookup failed'); } });
  await assert.rejects(failing.getAddress(coordinates), /Lookup failed/);
});

// These responses are test fixtures, never application fallback addresses.
const lookupFixture = { apiKey: 'test-only-credential', timeoutMs: 100 };
const jsonResponse = (results) => ({ ok: true, json: async () => ({ results }) });

test('Geoapify receives original coordinates and language, then returns its formatted address', async () => {
  const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher: async (requestUrl, options) => {
    const url = new URL(requestUrl);
    assert.equal(url.origin + url.pathname, 'https://api.geoapify.com/v1/geocode/reverse');
    assert.equal(url.searchParams.get('lat'), String(coordinates.latitude));
    assert.equal(url.searchParams.get('lon'), String(coordinates.longitude));
    assert.equal(url.searchParams.get('lang'), 'ar');
    assert.equal(url.searchParams.get('format'), 'json');
    assert.equal(url.searchParams.get('apiKey'), lookupFixture.apiKey);
    assert.equal(options.credentials, 'omit');
    return jsonResponse([{ result_type: 'street', formatted: ' Provider fixture address ' }]);
  } });
  assert.equal(await lookup(coordinates, { language: 'ar' }), 'Provider fixture address');
});

test('lookup uses only returned address lines when the formatted field is missing', async () => {
  const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher: async () => jsonResponse([
    { result_type: 'street', address_line1: 'Provider line one', address_line2: 'Provider line two' },
  ]) });
  assert.equal(await lookup(coordinates), 'Provider line one, Provider line two');
});

test('empty, incomplete, and overly broad provider results leave manual entry available', async () => {
  for (const results of [[], [{}], [{ result_type: 'country', formatted: 'Country fixture' }], [{ result_type: 'state', formatted: 'State fixture' }]]) {
    const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher: async () => jsonResponse(results) });
    assert.equal(await lookup(coordinates), null);
  }
});

test('missing key and invalid coordinates never send an external request', async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return jsonResponse([]); };
  await assert.rejects(createGeoapifyReverseGeocoder({ fetcher })(coordinates), { code: 'lookupUnavailable' });
  const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher });
  for (const point of [null, { latitude: NaN, longitude: 35 }, { latitude: 91, longitude: 35 }, { latitude: 31, longitude: 181 }]) {
    await assert.rejects(lookup(point), { code: 'lookupFailed' });
  }
  assert.equal(calls, 0);
});

test('HTTP, network, and malformed JSON failures expose no request details', async () => {
  for (const status of [401, 403, 429, 500]) {
    const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher: async () => ({ ok: false, status }) });
    await assert.rejects(lookup(coordinates), { code: status === 500 ? 'lookupFailed' : 'lookupUnavailable' });
  }
  for (const fetcher of [
    async () => { throw new Error(`Request failed: ${lookupFixture.apiKey}`); },
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid response'); } }),
  ]) {
    const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher });
    await assert.rejects(lookup(coordinates), (error) => error.code === 'lookupFailed' && !error.message.includes(lookupFixture.apiKey));
  }
});

test('timeout covers response-body reading, aborts the request, and finishes promptly', async () => {
  let requestSignal;
  const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, timeoutMs: 15, fetcher: async (url, options) => {
    requestSignal = options.signal;
    return { ok: true, json: () => new Promise(() => {}) };
  } });
  await assert.rejects(lookup(coordinates), { code: 'lookupTimeout' });
  assert.equal(requestSignal.aborted, true);
});

test('cancellation stops lookup even if the fetch implementation ignores the signal', async () => {
  const controller = new AbortController();
  let requestSignal;
  const lookup = createGeoapifyReverseGeocoder({ ...lookupFixture, fetcher: (url, options) => {
    requestSignal = options.signal;
    return new Promise(() => {});
  } });
  const pending = lookup(coordinates, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { code: 'cancelled' });
  assert.equal(requestSignal.aborted, true);
});
