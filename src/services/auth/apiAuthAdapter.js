import { AuthServiceError } from './authErrors.js';
import { saveSession } from './session.js';

// Backend endpoints provided by the API.
const REGISTER_PATIENT_PATH = '/api/Auth/register/patient';
const LOGIN_PATH = '/api/Auth/login';

// A slow backend must not leave the form in a permanent loading state.
const REQUEST_TIMEOUT_MS = 15000;

// Backend validation keys mapped back to the form field names.
const fieldAliases = {
  fullname: 'name',
  name: 'name',
  email: 'email',
  emailaddress: 'email',
  phonenumber: 'phone',
  phone: 'phone',
  password: 'password',
  confirmpassword: 'confirmPassword',
  gender: 'gender',
  location: 'location',
};

// Keys that may carry the token returned by the login endpoint.
const tokenKeys = [
  'token',
  'accessToken',
  'access_token',
  'jwt',
  'idToken',
  'authToken',
];

// Sends a JSON request and returns the parsed response body.
async function post(baseUrl, path, payload, { onBadRequest }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // Timeouts and connection failures both report a network problem.
    throw new AuthServiceError('network');
  } finally {
    clearTimeout(timeout);
  }

  const body = await readBody(response);

  if (!response.ok) {
    throw toServiceError(response.status, body, onBadRequest);
  }

  return body;
}

// Parses the response body without failing on empty or non-JSON answers.
async function readBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Converts an unsuccessful HTTP response into an error code the form can show.
function toServiceError(status, body, onBadRequest) {
  if (status === 429) return new AuthServiceError('rateLimited');

  if (status >= 500) return new AuthServiceError('unavailable');

  if (status === 400 || status === 401 || status === 403 || status === 409) {
    const fieldErrors = extractFieldErrors(body);

    // Wrong credentials on the login endpoint are reported as one message.
    if (onBadRequest === 'invalidCredentials' && !Object.keys(fieldErrors).length) {
      return new AuthServiceError('invalidCredentials');
    }

    return new AuthServiceError('validation', fieldErrors);
  }

  return new AuthServiceError('unexpected');
}

// Reads ASP.NET validation details (problem details or model state)
// and converts them into { formField: errorCode } pairs.
function extractFieldErrors(body) {
  const details = body?.errors ?? body?.validationErrors ?? null;
  if (!details || typeof details !== 'object') return {};

  const fieldErrors = {};

  Object.entries(details).forEach(([key, messages]) => {
    const field = fieldAliases[key.toLowerCase().replace(/[^a-z]/g, '')];
    if (!field) return;

    fieldErrors[field] = toFieldCode(field, messages);
  });

  return fieldErrors;
}

// Translates a backend message into one of the codes the form displays.
function toFieldCode(field, messages) {
  const text = Array.isArray(messages)
    ? messages.join(' ')
    : String(messages ?? '');
  const message = text.toLowerCase();

  // Duplicate values ("already taken") are reported as a generic problem.
  if (/already|taken|exist/.test(message)) {
    return 'invalid';
  }

  if (field === 'password' && /(least|minim|length|character)/.test(message)) {
    return 'passwordLength';
  }
  if (
    field === 'confirmPassword' &&
    /match/.test(message)
  ) {
    return 'passwordMismatch';
  }
  if (field === 'email' && /valid|format|email/.test(message)) {
    return 'email';
  }
  if (field === 'phone' && /phone|digits|number/.test(message)) {
    return 'phone';
  }
  if (/required|missing|empty/.test(message)) {
    return 'required';
  }

  return 'invalid';
}

// Looks for a token in the response of the login endpoint.
function extractToken(body) {
  const scopes = [body, body?.data];

  for (const scope of scopes) {
    if (!scope || typeof scope !== 'object') continue;

    for (const key of tokenKeys) {
      if (typeof scope[key] === 'string' && scope[key]) return scope[key];
    }
  }

  return null;
}

// Looks for the signed-in user in the response of the login endpoint.
function extractUser(body) {
  const scopes = [body, body?.data, body?.result];

  for (const scope of scopes) {
    if (scope?.user && typeof scope.user === 'object') return scope.user;
  }

  for (const scope of scopes) {
    if (!scope || typeof scope !== 'object') continue;
    if (scope.email || scope.fullName || scope.id || scope.userId) return scope;
  }

  return null;
}

// Calls the real backend described by API_BASE_URL.
export function createApiAuthAdapter(baseUrl) {
  const root = baseUrl.replace(/\/+$/, '');

  return {
    mode: 'live',

    async registerPatient(request) {
      await post(
        root,
        REGISTER_PATIENT_PATH,
        {
          fullName: request.fullName,
          email: request.email,
          phoneNumber: request.phone,
          password: request.password,
          gender: request.gender,
        },
        { onBadRequest: 'validation' }
      );

      // The account exists now; the user signs in on the next screen.
      return { mode: 'live', status: 'registered', role: 'patient' };
    },

    async loginPatient(credentials) {
      const body = await post(
        root,
        LOGIN_PATH,
        {
          email: credentials.email,
          password: credentials.password,
        },
        { onBadRequest: 'invalidCredentials' }
      );

      // Keep the session so the dashboard can use it after navigation.
      saveSession({
        token: extractToken(body),
        user: extractUser(body),
        authenticatedAt: Date.now(),
      });

      return { mode: 'live', status: 'authenticated', role: 'patient' };
    },
  };
}
