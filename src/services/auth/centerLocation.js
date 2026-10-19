function lookupError(code) {
  return Object.assign(new Error(code), { code });
}

// Converts coordinates to an address without depending on the registration API.
export function createGeoapifyReverseGeocoder({ apiKey, fetcher = globalThis.fetch, timeoutMs = 10000 } = {}) {
  return async function reverseGeocode(coordinates, { language = 'en', signal } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw lookupError('lookupUnavailable');
    const { latitude, longitude } = coordinates ?? {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw lookupError('lookupFailed');
    }
    if (signal?.aborted) throw lookupError('cancelled');

    const url = new URL('https://api.geoapify.com/v1/geocode/reverse');
    url.search = new URLSearchParams({ lat: latitude, lon: longitude, lang: language === 'ar' ? 'ar' : 'en', format: 'json', limit: '1', apiKey: apiKey.trim() });
    const controller = new AbortController();
    let timer;
    let cancel;
    let timedOut = false;
    const interrupted = new Promise((resolve, reject) => {
      cancel = () => {
        controller.abort();
        reject(lookupError('cancelled'));
      };
      signal?.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(lookupError('lookupTimeout'));
      }, timeoutMs);
    });

    try {
      const request = async () => {
        const response = await fetcher(url.toString(), { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
        if (!response.ok) {
          throw lookupError([401, 403, 429].includes(response.status) ? 'lookupUnavailable' : 'lookupFailed');
        }
        const data = await response.json();
        const result = data?.results?.[0];
        // A country or state alone is too broad to fill the center address.
        if (!result || ['country', 'state', 'continent', 'unknown'].includes(result.result_type)) return null;
        if (typeof result.formatted === 'string' && result.formatted.trim()) return result.formatted.trim();
        const lines = [...new Set([result.address_line1, result.address_line2]
          .filter((line) => typeof line === 'string' && line.trim()).map((line) => line.trim()))];
        return lines.length ? lines.join(language === 'ar' ? '، ' : ', ') : null;
      };
      return await Promise.race([request(), interrupted]);
    } catch (error) {
      // Never pass a request URL, key, or provider response into an error message.
      const code = timedOut ? 'lookupTimeout' : signal?.aborted ? 'cancelled' : error?.code;
      throw lookupError(['lookupTimeout', 'lookupUnavailable', 'cancelled'].includes(code) ? code : 'lookupFailed');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  };
}

export function createCenterLocationService({ reverseGeocode = null } = {}) {
  function getCoordinates(geolocation = globalThis.navigator?.geolocation) {
    return new Promise((resolve, reject) => {
      if (!geolocation) {
        reject({ code: 'unsupported' });
        return;
      }
      geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        ({ code }) => reject({ code: code === 1 ? 'denied' : code === 3 ? 'timeout' : 'failed' }),
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
      );
    });
  }

  async function getAddress(coordinates, options = {}) {
    if (!reverseGeocode) return null;
    const address = await reverseGeocode(coordinates, options);
    return typeof address === 'string' && address.trim() ? address.trim() : null;
  }

  return { getCoordinates, getAddress };
}

export const centerLocationService = createCenterLocationService({
  reverseGeocode: createGeoapifyReverseGeocoder({ apiKey: import.meta.env?.VITE_GEOAPIFY_API_KEY }),
});
