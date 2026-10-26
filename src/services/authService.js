import { AuthServiceError, normalizeAuthError } from './auth/authErrors.js';
import { createMockAuthAdapter } from './auth/mockAuthAdapter.js';
import { createOperationAdapter } from './api/operationAdapter.js';
import { authOperations } from './api/backendContract.js';
import { httpClient, mockEnabled } from './runtime.js';

// The backend URL is provided in the .env file as API_BASE_URL.
const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';

// Every role talks to the same API through the shared operation contract.
const liveAdapter = apiBaseUrl ? createOperationAdapter(httpClient, authOperations) : null;

// Mock authentication exists only in mock mode; API mode never falls back to it.
const demoAdapter = mockEnabled && import.meta.env?.DEV == true ? createMockAuthAdapter() : null;

function adapterFor(role) {
  // Patient sign-in has always used the real backend when one is configured.
  if (role === 'patient') return liveAdapter ?? demoAdapter;
  if (mockEnabled) return demoAdapter;
  return liveAdapter ?? demoAdapter;
}

export const authMode = liveAdapter?.mode ?? demoAdapter?.mode ?? 'unavailable';
export const isAuthDemo = authMode === 'demo';

// Executes one adapter method and converts failures into service errors.
async function execute(adapter, method, request) {
  try {
    // The operation contract exposes execute(); the mock adapter exposes methods.
    return await (adapter.execute ? adapter.execute(method, request) : adapter[method](request));
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

// A production build needs a real API adapter before account access is available.
async function callAuth(role, method, request) {
  const adapter = adapterFor(role);

  // The operation contract dispatches through execute(); the mock adapter
  // exposes one method per operation.
  const usable = adapter && (adapter.execute || typeof adapter[method] === 'function');
  if (!usable) {
    throw new AuthServiceError('unavailable');
  }

  return execute(adapter, method, request);
}

// Restoring and clearing a session are supported by both adapters.
// The backend session wins when it has one; otherwise the mock session is used.
async function callSessionAuth(method) {
  // The operation contract dispatches through execute(); the mock adapter
  // exposes one method per operation.
  const adapters = [liveAdapter, demoAdapter].filter(
    (adapter) => adapter && (adapter.execute || typeof adapter[method] === 'function')
  );

  if (!adapters.length) throw new AuthServiceError('unavailable');

  // Signing out clears every adapter that could still hold a session.
  if (method !== 'restoreSession') {
    for (const adapter of adapters) {
      await execute(adapter, method, undefined);
    }
    return undefined;
  }

  // No stored session means the visitor is signed out, which is a normal
  // state: protected routes redirect to the login screen instead of failing.
  for (const adapter of adapters) {
    const restored = await execute(adapter, 'restoreSession', undefined);
    if (restored) return restored;
  }

  return null;
}

// Signing in publishes the session so the protected routes can open the portal.
export const loginPatient = (credentials) =>
  login('patient', 'loginPatient', credentials);
export const loginCenter = (credentials) =>
  login('center', 'loginCenter', credentials);
export const registerPatient = (data) =>
  callAuth('patient', 'registerPatient', data);
export const registerCenter = (data) =>
  callAuth('center', 'registerCenter', data);

export function getAuthenticatedDestination(role) {
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'center') return '/center/dashboard';
  if (role === 'physiotherapist') return '/center/physiotherapist';
  throw new AuthServiceError('unsupportedRole');
}

















































//  ******************************************************** new ones **********************************************************








// import { validCoordinates } from './center/remainingOperations.js';
// import { AuthServiceError, normalizeAuthError } from './auth/authErrors.js';
// import { createMockAuthAdapter } from './auth/mockAuthAdapter.js';
import { createBrowserStore } from './mock/browserStore.js';
// import { readMockCenter, activateMockCenter, getMockTherapists } from './mock/centerRepository.js';
import { mockAccountStore } from './mock/accountRepository.js';
// import { createOperationAdapter } from './api/operationAdapter.js';
// import { authOperations } from './api/backendContract.js';

const sessionStore = createBrowserStore('physioguide.mock.session.v1');
const accountStore = mockAccountStore;
// const adapter = mockEnabled ? createMockAuthAdapter({
//   accountStore, sessionStore, getTherapists: getMockTherapists,
//   getCenter: id => readMockCenter(id).center, activateCenter: activateMockCenter,
// }) : createOperationAdapter(httpClient, authOperations);
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

// async function callAuth(method, request) {
//   try {
//     return adapter.execute ? await adapter.execute(method, request) : await adapter[method](request);
//   } catch (error) {
//     throw normalizeAuthError(error);
//   }
// }

async function login(role, method, credentials) {
  const current = ++generation;
  const result = await callAuth(role, method, credentials);
  if (result.status !== 'authenticated' || !result.session || result.role !== result.session.role) throw new AuthServiceError('unexpected');
  getAuthenticatedDestination(result.role);
  if (current === generation) publish(result.session);
  return result;
}

async function applicationOperation(method, request = {}) {
  const actor = await callSessionAuth('restoreSession');
  if (actor?.role !== 'admin') throw new AuthServiceError('forbidden');
  return callAuth(null, method, { ...request, actor });
}
export const listCenterApplications = status => applicationOperation('listCenterApplications', { status });
export const getCenterApplication = id => applicationOperation('getCenterApplication', { id });
export const approveCenterApplication = id => applicationOperation('reviewCenterApplication', { id, decision: 'approved' });
export const rejectCenterApplication = (id, reason) => applicationOperation('reviewCenterApplication', { id, decision: 'rejected', reason });

export function restoreSession({ force = false } = {}) {
  if (restoration && !force) return restoration;
  const current = ++generation;
  restoration = callSessionAuth('restoreSession').then(session => {
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
  await callSessionAuth('logout');
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