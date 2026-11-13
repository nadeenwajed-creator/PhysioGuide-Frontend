// The single gate every request goes through.
//
// It owns everything that is identical for every endpoint: the base URL, the
// bearer header, JSON/multipart encoding, query strings, timeouts, the API's
// error contract, and the one allowed refresh-token retry. Endpoints themselves
// live in backendContract.js so this file never learns a path.

import { ServiceError } from './serviceError.js';
import { loadSession, saveSession, clearSession } from '../auth/session.js';
import { mapFieldErrors, uiErrorCode } from './validationFields.js';

// Statuses that map straight onto the codes the interface already handles.
const statusCodes = {
  400: 'validation',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  // Uploads larger than the server accepts come back as 413
  413: 'image',
  415: 'validation',
  422: 'validation',
  429: 'rateLimited',
};

const REFRESH_PATH = '/api/Auth/refresh';

export function createGateway({
  baseUrl = '',
  fetcher = globalThis.fetch,
  getHeaders = () => ({}),
  credentials = 'omit',
  timeoutMs = 15000,
} = {}) {
  const root = String(baseUrl || '').replace(/\/+$/, '');

  // Concurrent 401s must share one refresh instead of racing each other.
  let refreshing = null;

  function urlFor(path) {
    if (!root) throw new ServiceError('unavailable');
    const base = new URL(root, globalThis.location?.origin || 'http://localhost');
    const url = new URL(path, base.href.endsWith('/') ? base : `${base.href}/`);
    // A path that escapes the API origin is a programming error, not a redirect.
    if (url.origin !== base.origin) throw new ServiceError('unavailable');
    return url;
  }

  async function parseBody(response) {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // Exchanges the stored refresh token for a new access token.
  // Returns false when the session is gone for good.
  async function refreshSession() {
    const stored = loadSession();
    if (!stored?.refreshToken || !root) return false;

    try {
      const response = await fetcher(urlFor(REFRESH_PATH).href, {
        method: 'POST',
        credentials,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });
      const body = await parseBody(response);

      if (!response.ok || !body?.accessToken) {
        clearSession();
        return false;
      }

      saveSession({
        ...stored,
        token: body.accessToken,
        refreshToken: body.refreshToken || stored.refreshToken,
        authenticatedAt: Date.now(),
      });
      return true;
    } catch {
      // A dropped connection here must not sign the user out.
      return false;
    }
  }

  function runRefresh() {
    refreshing ??= refreshSession().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(method, path, options = {}) {
    const {
      data,
      query,
      signal,
      headers = {},
      auth = true,
      retry = true,
      timeout = timeoutMs,
    } = options;

    const url = urlFor(path);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });

    const controller = new AbortController();
    let rejectAbort;
    const aborted = new Promise((_, reject) => {
      rejectAbort = reject;
    });
    // An abort that lands after the request already settled has no race left
    // to deliver it to; swallow it so it never becomes an unhandled rejection.
    aborted.catch(() => {});
    const onAbort = () => rejectAbort(new ServiceError('cancelled'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    const abort = () => controller.abort();
    if (signal?.aborted) throw new ServiceError('cancelled');
    signal?.addEventListener('abort', abort, { once: true });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);

    const multipart = typeof FormData !== 'undefined' && data instanceof FormData;
    const token = auth ? loadSession()?.token : null;

    try {
      const sessionHeaders = await Promise.race([aborted, Promise.resolve().then(getHeaders)]);
      const response = await Promise.race([
        aborted,
        fetcher(url.href, {
          method,
          credentials,
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(data !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
            ...sessionHeaders,
            ...headers,
          },
          ...(data === undefined ? {} : { body: multipart ? data : JSON.stringify(data) }),
        }),
      ]);

      // Reading the body is covered by the same timeout/abort race as the
      // fetch itself: a stalled response stream must fail as timeout or
      // cancellation, never hang the caller forever.
      if (response.ok) return await Promise.race([aborted, parseBody(response)]);

      const body = await Promise.race([aborted, parseBody(response)]).catch(() => null);
      const apiCode = typeof body?.code === 'string' ? body.code : null;

      // Expired access token: refresh once and replay the original request.
      // The refresh exchange shares this request's timeout/abort race so a
      // stalled refresh fails the caller instead of freezing it forever.
      if (response.status === 401 && apiCode === 'token_expired' && retry && auth) {
        if (await Promise.race([aborted, runRefresh()])) {
          return await send(method, path, { ...options, retry: false });
        }
      }

      // Nothing left to recover with: drop the session so routes redirect.
      if (response.status === 401 && ['unauthenticated', 'invalid_refresh_token'].includes(apiCode)) {
        clearSession();
      }

      throw toServiceError(response.status, body, response.headers);
    } catch (error) {
      if (timedOut) throw new ServiceError('timeout');
      if (signal?.aborted) throw new ServiceError('cancelled');
      if (error instanceof ServiceError) throw error;
      throw new ServiceError('network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', onAbort);
    }
  }

  return {
    send,
    get: (path, options) => send('GET', path, options),
    post: (path, options) => send('POST', path, options),
    put: (path, options) => send('PUT', path, options),
    patch: (path, options) => send('PATCH', path, options),
    delete: (path, options) => send('DELETE', path, options),
  };
}

// One translation from the API's error contract to a ServiceError:
// validation bodies carry field keys, everything else carries a stable `code`.
function toServiceError(status, body, headers) {
  const fields = mapFieldErrors(body);
  const fallback = statusCodes[status] || 'server';
  const code = status === 400 || status === 409 ? (uiErrorCode(body, fallback) || fallback) : uiErrorCode(body, fallback);

  const error = new ServiceError(code, { status, fields });
  if (status === 429) {
    const retryAfter = headers?.get?.('Retry-After');
    if (retryAfter) error.retryAfter = Number(retryAfter) || 0;
  }
  return error;
}