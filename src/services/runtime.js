import { createHttpClient } from './api/httpClient.js';
import { transportOptions } from './api/backendContract.js';

// The demo uses the same data mode in development and built previews.
// API mode never falls back to mock authentication when an operation fails.
export const mockEnabled = (import.meta.env?.VITE_DATA_MODE ?? 'mock') === 'mock';
export const httpClient = createHttpClient({ baseUrl: import.meta.env?.VITE_API_BASE_URL || '', ...transportOptions });
