import { AuthServiceError } from './authErrors.js';

// Simulates requests without storing accounts, passwords, tokens, or sessions.
export function createMockAuthAdapter({ delay = 450, failure = null } = {}) {
  // Adds a short delay to show the loading state.
  async function respond(role, action) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    if (failure) throw new AuthServiceError(failure);
    // These results do not authenticate or approve a user.
    return {
      mode: 'demo',
      status: action === 'login' ? 'validated' : 'not-created',
      role,
    };
  }

  return {
    mode: 'demo',
    loginPatient: () => respond('patient', 'login'),
    loginCenter: () => respond('center', 'login'),
    registerPatient: () => respond('patient', 'register'),
    registerCenter: () => respond('center', 'register'),
  };
}
