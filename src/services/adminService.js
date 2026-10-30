import { ServiceError, normalizeServiceError } from './api/serviceError.js';
import { createOperationAdapter } from './api/operationAdapter.js';
import { adminOperations } from './api/backendContract.js';
import { getAuthSnapshot, restoreSession } from './authService.js';
import { httpClient, mockEnabled } from './runtime.js';
import { adminMockApi } from './mock/adminData.js';

// The backend URL is provided in the .env file as VITE_API_BASE_URL.
const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? '';
const apiAdapter = apiBaseUrl ? createOperationAdapter(httpClient, adminOperations) : null;

// Every admin read and write goes through here. The session must belong to an
// admin, and the data source follows the same mock/API switch as the other
// portals: VITE_DATA_MODE=api talks to the real endpoints, the default serves
// the bundled demo records. API mode never falls back to mock data.
export async function callAdmin(method, ...args) {
  try {
    const session = getAuthSnapshot().session || (await restoreSession());
    if (session?.role !== 'admin') throw new ServiceError('forbidden');

    if (mockEnabled) {
      const operation = adminMockApi[method];
      if (!operation) throw new ServiceError('unavailable');
      return await operation(session, ...args);
    }

    if (!apiAdapter) throw new ServiceError('unavailable');
    return await apiAdapter.execute(method, session, ...args);
  } catch (error) {
    throw normalizeServiceError(error);
  }
}
