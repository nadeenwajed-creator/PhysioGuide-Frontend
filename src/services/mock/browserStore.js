import { ServiceError } from '../api/serviceError.js';

// Only non-sensitive test records belong here. API adapters never use browser persistence.
export function createBrowserStore(key, { version = 1, storage = () => globalThis.localStorage } = {}) {
  return {
    key,
    read() {
      try {
        const raw = storage()?.getItem(key);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object' || !saved.data || typeof saved.data !== 'object') {
          throw new ServiceError('storageUnavailable');
        }
        if (saved.version !== version) throw new ServiceError('storageVersion');
        return saved.data;
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError('storageUnavailable');
      }
    },
    write(data) {
      try {
        const target = storage();
        if (!target) throw new Error();
        target.setItem(key, JSON.stringify({ version, data }));
      } catch { throw new ServiceError('storageUnavailable'); }
    },
    remove() {
      try { storage()?.removeItem(key); } catch { throw new ServiceError('storageUnavailable'); }
    },
  };
}
