import { ServiceError } from './serviceError.js';

export function createOperationAdapter(client, operations = {}) {
  return {
    mode: 'api',
    async execute(operation, ...args) {
      const mapping = operations[operation];
      if (mapping?.execute) return mapping.execute(client, ...args);
      if (!mapping?.request || !mapping?.response) throw new ServiceError('unavailable');
      const { method, path, ...options } = mapping.request(...args);
      const send = client[method?.toLowerCase()];
      if (!send || !path) throw new ServiceError('unavailable');
      try {
        const response = await send(path, options);
        try { return await mapping.response(response, ...args); }
        catch (error) { throw error instanceof ServiceError ? error : new ServiceError('invalidResponse'); }
      } catch (error) {
        throw mapping.error ? mapping.error(error) : error;
      }
    },
  };
}
