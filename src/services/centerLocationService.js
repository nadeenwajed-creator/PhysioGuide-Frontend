import { centerLocationService } from './auth/centerLocation.js';
import { validCoordinates } from './center/remainingOperations.js';
export { validCoordinates } from './center/remainingOperations.js';

export function hasSavedCenterLocation(center) {
  // Registration saved coordinates before the confirmation flag was introduced.
  return validCoordinates(center.coordinates) && center.locationConfirmed !== false;
}

export function createCenterAddressSearch({ apiKey, fetcher = globalThis.fetch, timeoutMs = 10000 } = {}) {
  return async (text, { language = 'en', signal } = {}) => {
    const fail = code => Object.assign(new Error(code), { code });
    if (!apiKey?.trim()) throw fail('lookupUnavailable');
    if (!text?.trim()) return [];
    const url = new URL('https://api.geoapify.com/v1/geocode/search');
    url.search = new URLSearchParams({ text: text.trim(), lang: language === 'ar' ? 'ar' : 'en', format: 'json', limit: '5', apiKey: apiKey.trim() });
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, timeoutMs);
    try {
      if (signal?.aborted) throw fail('cancelled');
      const response = await fetcher(url.toString(), { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw fail([401, 403, 429].includes(response.status) ? 'lookupUnavailable' : 'lookupFailed');
      const data = await response.json();
      if (!Array.isArray(data.results)) throw fail('lookupFailed');
      return data.results.filter(item => typeof item.formatted === 'string' && item.formatted.trim()
        && !['country', 'state', 'continent', 'unknown'].includes(item.result_type)
        && validCoordinates({ latitude: item.lat, longitude: item.lon }))
        .map(item => ({ address: item.formatted.trim(), coordinates: { latitude: item.lat, longitude: item.lon } }));
    } catch (error) {
      const code = signal?.aborted ? 'cancelled' : controller.signal.aborted ? 'lookupTimeout' : error.code;
      throw fail(['cancelled', 'lookupTimeout', 'lookupUnavailable'].includes(code) ? code : 'lookupFailed');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  };
}

// OpenStreetMap's own geocoder needs no key, so address search keeps working
// when no Geoapify key is configured. It is rate limited to about one request
// per second, which suits a search typed by hand.
export function createNominatimAddressSearch({ fetcher = globalThis.fetch, timeoutMs = 10000 } = {}) {
  return async (text, { language = 'en', signal } = {}) => {
    const fail = code => Object.assign(new Error(code), { code });
    if (!text?.trim()) return [];
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({ format: 'jsonv2', limit: '5', 'accept-language': language === 'ar' ? 'ar' : 'en', q: text.trim() });
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, timeoutMs);
    try {
      if (signal?.aborted) throw fail('cancelled');
      const response = await fetcher(url.toString(), {
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw fail([401, 403, 429].includes(response.status) ? 'lookupUnavailable' : 'lookupFailed');
      const data = await response.json();
      if (!Array.isArray(data)) throw fail('lookupFailed');
      return data.filter(item => typeof item.display_name === 'string' && item.display_name.trim()
        && !['country', 'state', 'continent', 'unknown'].includes(item.type)
        && validCoordinates({ latitude: Number(item.lat), longitude: Number(item.lon) }))
        .map(item => ({ address: item.display_name.trim(), coordinates: { latitude: Number(item.lat), longitude: Number(item.lon) } }));
    } catch (error) {
      const code = signal?.aborted ? 'cancelled' : controller.signal.aborted ? 'lookupTimeout' : error.code;
      throw fail(['cancelled', 'lookupTimeout', 'lookupUnavailable'].includes(code) ? code : 'lookupFailed');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  };
}

const geoapifyKey = import.meta.env?.VITE_GEOAPIFY_API_KEY;

export const searchCenterAddress = geoapifyKey?.trim()
  ? createCenterAddressSearch({ apiKey: geoapifyKey })
  : createNominatimAddressSearch();

// Registration owns permission errors; settings also needs accuracy for confirmation.
export async function locateCenterDevice(geolocation = globalThis.navigator?.geolocation) {
  let accuracy = null;
  const provider = geolocation && {
    getCurrentPosition(success, error, options) {
      geolocation.getCurrentPosition(position => {
        accuracy = position.coords.accuracy;
        success(position);
      }, error, options);
    },
  };
  const coordinates = await centerLocationService.getCoordinates(provider);
  return { coordinates, accuracy };
}
export const lookupCenterAddress = (coordinates, options) => centerLocationService.getAddress(coordinates, options);

export function centerMapLinks(coordinates) {
  const { latitude, longitude } = coordinates;
  const box = [Math.max(-180, longitude - .006), Math.max(-90, latitude - .004), Math.min(180, longitude + .006), Math.min(90, latitude + .004)].join(',');
  return {
    page: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${latitude}%2C${longitude}`,
  };
}
