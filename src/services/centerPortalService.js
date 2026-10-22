import { createMockCenterAdapter } from './center/mockCenterAdapter.js';
import { centerStore, getCenterStore, readMockCenter, getMockTherapists } from './mock/centerRepository.js';
import { getAuthSnapshot, restoreSession } from './authService.js';
import { mockEnabled, httpClient } from './runtime.js';
import { createOperationAdapter } from './api/operationAdapter.js';
import { centerOperations } from './api/backendContract.js';
import { ServiceError, normalizeServiceError } from './api/serviceError.js';
import { authorizeCenterOperation } from './center/access.js';
import { mockAccountStore } from './mock/accountRepository.js';
import { mockAccounts } from './auth/mockAccounts.js';

const adapters = new Map();
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener());
function getAdapter(centerId) {
  const key = mockEnabled ? centerId : 'api';
  if (!adapters.has(key)) {
    const adapter = mockEnabled ? createMockCenterAdapter(readMockCenter(centerId), {
      store: getCenterStore(centerId),
      reservedEmails: () => [...mockAccounts, ...(mockAccountStore.read() || []), ...getMockTherapists().filter(person => person.centerId !== centerId)].map(account => account.email.toLowerCase()),
    }) : createOperationAdapter(httpClient, centerOperations);
    adapter.subscribe?.(emit);
    adapters.set(key, adapter);
  }
  return adapters.get(key);
}
export const subscribeCenter = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export async function callCenter(method, ...args) {
  try {
    const session = mockEnabled ? await restoreSession({ force: true }) : getAuthSnapshot().session || await restoreSession();
    if (!session || getAuthSnapshot().session?.id !== session.id) throw new ServiceError('unauthenticated');
    authorizeCenterOperation(session, method);
    if (method !== 'prepareImage') {
      const claimed = args[0];
      if (claimed?.id !== session.id || claimed?.role !== session.role) throw new ServiceError('forbidden');
      args[0] = session;
    } else if (!['center', 'physiotherapist'].includes(session.role)) throw new ServiceError('forbidden');
    const source = getAdapter(session.centerId);
    const result = source.execute ? await source.execute(method, ...args) : await source[method](...args);
    if (source.execute && method !== 'getWorkspace' && method !== 'prepareImage') emit();
    return result;
  } catch (error) {
    throw normalizeServiceError(error);
  }
}
export const getCenterWorkspace = actor => callCenter('getWorkspace', actor);
export const prepareCenterImage = file => callCenter('prepareImage', file);

if (mockEnabled && typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if ((!event.key || event.key.startsWith(centerStore.key)) && getAuthSnapshot().session) {
      try { for (const adapter of adapters.values()) adapter.reload?.(); } catch { emit(); }
    }
  });
}
