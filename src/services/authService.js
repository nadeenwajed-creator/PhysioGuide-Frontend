import { AuthServiceError, normalizeAuthError } from './auth/authErrors.js';
import { createMockAuthAdapter } from './auth/mockAuthAdapter.js';
import { createBrowserStore } from './mock/browserStore.js';
import { readMockCenter, activateMockCenter, getMockTherapists } from './mock/centerRepository.js';
import { mockAccountStore } from './mock/accountRepository.js';
import { mockEnabled, httpClient } from './runtime.js';
import { createOperationAdapter } from './api/operationAdapter.js';
import { authOperations } from './api/backendContract.js';

const sessionStore = createBrowserStore('physioguide.mock.session.v1');
const accountStore = mockAccountStore;
const adapter = mockEnabled ? createMockAuthAdapter({
  accountStore, sessionStore, getTherapists: getMockTherapists,
  getCenter: id => readMockCenter(id).center, activateCenter: activateMockCenter,
}) : createOperationAdapter(httpClient, authOperations);
const listeners = new Set();
let snapshot = { status: 'loading', session: null, error: null };
let restoration;
let generation = 0;
function publish(session, error = null) {
  if (snapshot.status !== 'loading' && snapshot.error === error && JSON.stringify(snapshot.session) === JSON.stringify(session)) return;
  snapshot = { status: session ? 'authenticated' : 'anonymous', session, error };
  listeners.forEach(listener => listener());
}
export const getAuthSnapshot = () => snapshot;
export const subscribeAuth = listener => { listeners.add(listener); return () => listeners.delete(listener); };

async function callAuth(method, request) {
  try {
    return adapter.execute ? await adapter.execute(method, request) : await adapter[method](request);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

async function login(method, credentials) {
  const current = ++generation;
  const result = await callAuth(method, credentials);
  if (result.status !== 'authenticated' || !result.session || result.role !== result.session.role) throw new AuthServiceError('unexpected');
  getAuthenticatedDestination(result.role);
  if (current === generation) publish(result.session);
  return result;
}
export const loginPatient = credentials => login('loginPatient', credentials);
export const loginCenter = credentials => login('loginCenter', credentials);
export const registerPatient = (data) => callAuth('registerPatient', data);
export const registerCenter = (data) => callAuth('registerCenter', data);

async function applicationOperation(method, request = {}) {
  const actor = await callAuth('restoreSession');
  if (actor?.role !== 'admin') throw new AuthServiceError('forbidden');
  return callAuth(method, { ...request, actor });
}
export const listCenterApplications = status => applicationOperation('listCenterApplications', { status });
export const getCenterApplication = id => applicationOperation('getCenterApplication', { id });
export const approveCenterApplication = id => applicationOperation('reviewCenterApplication', { id, decision: 'approved' });
export const rejectCenterApplication = (id, reason) => applicationOperation('reviewCenterApplication', { id, decision: 'rejected', reason });

export function restoreSession({ force = false } = {}) {
  if (restoration && !force) return restoration;
  const current = ++generation;
  restoration = callAuth('restoreSession').then(session => {
    if (session) getAuthenticatedDestination(session.role);
    if (current === generation) publish(session);
    return session;
  }).catch(error => {
    if (current === generation) publish(null, error.code);
    return null;
  });
  return restoration;
}
export async function logout() {
  await callAuth('logout');
  generation += 1;
  restoration = null;
  publish(null);
  return '/';
}

if (mockEnabled && typeof window !== 'undefined') {
  window.addEventListener('focus', () => restoreSession({ force: true }));
  window.addEventListener('storage', event => {
    if ([sessionStore.key, accountStore.key, null].includes(event.key) || event.key?.startsWith('physioguide.mock.center.v1')) restoreSession({ force: true });
  });
}

export function getAuthenticatedDestination(role) {
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'center') return '/center/dashboard';
  if (role === 'physiotherapist') return '/center/physiotherapist';
  throw new AuthServiceError('unsupportedRole');
}
