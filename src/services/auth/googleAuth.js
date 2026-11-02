// Google Identity Services flow, wired to /api/Auth/google/* per the backend
// contract: the browser owns a random verifier, the server owns the nonce that
// goes into the ID token, and the two are tied together through a challenge.
//
//   verifier  = 32 random bytes, hex (64 chars)
//   binding   = HEX(SHA256(UTF8(verifier)))  — sent to the challenge endpoint
//   challenge = { challengeId, nonce }       — nonce goes to GIS initialize()
//   sign-in   = POST { idToken, challengeId, flowVerifier }
//
// Every flow is single-use: a consumed challenge or registration ticket forces
// a fresh flow, which this module restarts automatically on those errors.

import { httpClient } from '../runtime.js';
import { ServiceError } from '../api/serviceError.js';

const AUTH_GOOGLE = '/api/Auth/google';

// The Web Client ID is public (it ships in the page bundle either way); it is
// kept in .env so an environment can override it without a code change.
const CLIENT_ID =
  import.meta.env?.VITE_GOOGLE_CLIENT_ID ||
  '564871365119-fsn3u0ssrangdvlsl2tqcup047utblgr.apps.googleusercontent.com';

// UI error codes (after validationFields aliasing) that mean "this flow is
// dead, start a new one": both carry single-use challenges or tickets.
const FLOW_RESET_CODES = new Set(['googleCredentials', 'googleTicket']);

export const GOOGLE_CLIENT_ID = CLIENT_ID;
export const isFlowResetError = (code) => FLOW_RESET_CODES.has(code);

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Fresh flow values: a 64-hex verifier and its SHA-256 binding (uppercase hex,
// exactly what the backend's FlowBinding regex accepts).
export async function createFlowValues() {
  const verifier = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  return { verifier, binding: toHex(digest).toUpperCase() };
}

// Requests a server nonce bound to this flow's verifier hash.
export async function requestChallenge(flowBinding) {
  const body = await httpClient.post(`${AUTH_GOOGLE}/challenge`, {
    data: { flowBinding },
    auth: false,
  });
  if (!body?.challengeId || !body?.nonce) throw new ServiceError('invalidResponse');
  return body;
}

// Exchanges the Google ID token for a PhysioGuide session — or a registration
// ticket when the Google account is new here.
export async function signInWithGoogle({ idToken, challengeId, flowVerifier }) {
  return httpClient.post(`${AUTH_GOOGLE}/sign-in`, {
    data: { idToken, challengeId, flowVerifier },
    auth: false,
  });
}

export async function registerGooglePatient({
  registrationTicket,
  flowVerifier,
  phoneNumber,
  fullName,
  gender,
}) {
  return httpClient.post(`${AUTH_GOOGLE}/register/patient`, {
    data: { registrationTicket, flowVerifier, phoneNumber, fullName, gender },
    auth: false,
  });
}

export async function registerGoogleCenter({
  registrationTicket,
  flowVerifier,
  phoneNumber,
  centerName,
  city,
  location,
  latitude,
  longitude,
}) {
  return httpClient.post(`${AUTH_GOOGLE}/register/center`, {
    data: {
      registrationTicket,
      flowVerifier,
      phoneNumber,
      centerName,
      city,
      location,
      latitude,
      longitude,
    },
    auth: false,
  });
}

// Resolves once the GIS script has attached its API to the page, or rejects
// after the timeout so the form can fall back to its disabled button.
export function waitForGis(timeoutMs = 12000) {
  if (globalThis.google?.accounts?.id) return Promise.resolve(true);
  if (typeof window === 'undefined') return Promise.reject(new ServiceError('unavailable'));
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (globalThis.google?.accounts?.id) {
        window.clearInterval(timer);
        resolve(true);
      } else if (Date.now() - started > timeoutMs) {
        window.clearInterval(timer);
        reject(new ServiceError('unavailable'));
      }
    }, 100);
  });
}
