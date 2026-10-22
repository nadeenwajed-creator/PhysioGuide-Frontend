import { createCenterPortalData } from '../../data/centerPortal.js';
import { createBrowserStore } from './browserStore.js';
import { MOCK_CENTER_ID } from '../auth/mockAccounts.js';
import { mockAccountStore } from './accountRepository.js';
import { ServiceError } from '../api/serviceError.js';

export const centerStore = createBrowserStore('physioguide.mock.center.v1');
export function getCenterStore(centerId = MOCK_CENTER_ID) {
  return centerId === MOCK_CENTER_ID ? centerStore : createBrowserStore(`${centerStore.key}:${encodeURIComponent(centerId)}`);
}
export function readMockCenter(centerId = MOCK_CENTER_ID) {
  const store = getCenterStore(centerId);
  const saved = store.read();
  if (saved) return saved;
  if (centerId !== MOCK_CENTER_ID) throw new ServiceError('unavailable');
  const seed = createCenterPortalData();
  store.write(seed);
  return seed;
}

export function activateMockCenter(application) {
  const store = getCenterStore(application.centerId);
  if (store.read()) return;
  const seed = createCenterPortalData();
  for (const key of ['patients', 'therapists', 'services', 'appointments', 'reviews', 'conversations', 'notifications']) seed[key] = [];
  seed.center = {
    id: application.centerId, name: { en: application.name, ar: application.name },
    email: application.email, phone: application.phone || '',
    address: { en: application.location?.address || '', ar: application.location?.address || '' },
    coordinates: application.location?.coordinates || null,
    about: { en: '', ar: '' }, imageUrl: '', gallery: [], hours: null,
  };
  store.write(seed);
}

export function getMockTherapists() {
  const ids = [MOCK_CENTER_ID, ...(mockAccountStore.read() || []).filter(item => item.role === 'center' && item.status === 'approved').map(item => item.centerId)];
  return ids.flatMap(centerId => readMockCenter(centerId).therapists.map(person => ({ ...person, centerId })));
}
