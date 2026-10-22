import { ServiceError } from './serviceError.js';

const statusCodes = { 400: 'validation', 401: 'unauthenticated', 403: 'forbidden', 404: 'notFound', 409: 'conflict', 422: 'validation', 429: 'rateLimited' };

// Endpoint paths, credentials and response mappings belong to adapters, not this transport.
export function createHttpClient({ baseUrl = '', fetcher = globalThis.fetch, getHeaders = () => ({}), credentials = 'omit', timeoutMs = 15000 } = {}) {
  async function request(method, path, { data, query, signal, headers = {} } = {}) {
    if (!baseUrl || !path) throw new ServiceError('unavailable');
    const base = new URL(baseUrl, globalThis.location?.origin || 'http://localhost');
    const url = new URL(path, base.href.endsWith('/') ? base : `${base.href}/`);
    if (url.origin !== base.origin) throw new ServiceError('unavailable');
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    const controller = new AbortController();
    let rejectAbort;
    const aborted = new Promise((resolve, reject) => { rejectAbort = reject; });
    const onAbort = () => rejectAbort(new ServiceError('cancelled'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    const abort = () => controller.abort();
    if (signal?.aborted) throw new ServiceError('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const multipart = typeof FormData !== 'undefined' && data instanceof FormData;
    try {
      const sessionHeaders = await Promise.race([aborted, Promise.resolve().then(getHeaders)]);
      const response = await Promise.race([aborted, fetcher(url.href, {
        method, credentials, signal: controller.signal,
        headers: { Accept: 'application/json', ...(data !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}), ...sessionHeaders, ...headers },
        ...(data === undefined ? {} : { body: multipart ? data : JSON.stringify(data) }),
      })]);
      if (!response.ok) {
        const error = new ServiceError(statusCodes[response.status] || 'server', { status: response.status });
        // Only the contract mapper may interpret backend validation details; UI messages use codes.
        error.responseData = await Promise.race([aborted, response.json().catch(() => null)]);
        throw error;
      }
      if (response.status === 204) return null;
      try { return await Promise.race([aborted, response.json()]); } catch { throw new ServiceError('invalidResponse'); }
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
  return Object.fromEntries(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => [method.toLowerCase(), (path, options) => request(method, path, options)]));
}
