import { AuthServiceError, normalizeAuthError } from './auth/authErrors.js';
import { createMockAuthAdapter } from './auth/mockAuthAdapter.js';

// Mock authentication runs only in development and never creates a real session.
const adapter = import.meta.env?.DEV === true ? createMockAuthAdapter() : null;

export const authMode = adapter?.mode ?? 'unavailable';
export const isAuthDemo = authMode === 'demo';

// A production build needs a real API adapter before account access is available.
async function callAuth(method, request) {
  if (!adapter) throw new AuthServiceError('unavailable');
  try {
    return await adapter[method](request);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const loginPatient = (credentials) => callAuth('loginPatient', credentials);
export const loginCenter = (credentials) => callAuth('loginCenter', credentials);
export const registerPatient = (data) => callAuth('registerPatient', data);
export const registerCenter = (data) => callAuth('registerCenter', data);

// Chooses the dashboard after a real session has been confirmed.
export function getAuthenticatedDestination(role) {
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'center') return '/center/dashboard';
  // Other roles need a confirmed backend access policy.
  throw new AuthServiceError('unsupportedRole');
}
