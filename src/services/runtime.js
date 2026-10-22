import { createHttpClient } from './api/httpClient.js';
import { transportOptions } from './api/backendContract.js';

export const mockEnabled = import.meta.env?.DEV === true && (import.meta.env?.VITE_DATA_MODE ?? 'mock') === 'mock';
export const httpClient = createHttpClient({ baseUrl: import.meta.env?.VITE_API_BASE_URL || '', ...transportOptions });
