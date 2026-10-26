import { AuthServiceError, normalizeAuthError } from './auth/authErrors.js';
import { createMockAuthAdapter } from './auth/mockAuthAdapter.js';
import { createApiAuthAdapter } from './auth/apiAuthAdapter.js';

// The backend URL is provided in the .env file as API_BASE_URL.
const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';

// Patient sign-in and registration use the real backend when it is configured.
const liveAdapter = apiBaseUrl ? createApiAuthAdapter(apiBaseUrl) : null;

// Mock authentication runs only in development and never creates a real session.
const demoAdapter = import.meta.env?.DEV == true ? createMockAuthAdapter() : null;

// Centers have no backend endpoints yet, so they keep the mock adapter.
function adapterFor(role) {
  if (role === 'patient') return liveAdapter ?? demoAdapter;
  return demoAdapter;
}

export const authMode = liveAdapter?.mode ?? demoAdapter?.mode ?? 'unavailable';
export const isAuthDemo = authMode === 'demo';

// A production build needs a real API adapter before account access is available.
async function callAuth(role, method, request) {
  const adapter = adapterFor(role);

  if (!adapter) throw new AuthServiceError('unavailable');
  try {
    return await adapter[method](request);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const loginPatient = (credentials) =>
  callAuth('patient', 'loginPatient', credentials);
export const loginCenter = (credentials) =>
  callAuth('center', 'loginCenter', credentials);
export const registerPatient = (data) =>
  callAuth('patient', 'registerPatient', data);
export const registerCenter = (data) =>
  callAuth('center', 'registerCenter', data);

// Chooses the dashboard after a real session has been confirmed.
export function getAuthenticatedDestination(role) {
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'center') return '/center/dashboard';
  // Other roles need a confirmed backend access policy.
  throw new AuthServiceError('unsupportedRole');
}