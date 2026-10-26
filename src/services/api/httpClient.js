import { createGateway } from './gateway.js';

// Endpoint paths, credentials and response mappings belong to adapters, not this transport.
// The gateway behind it is the one place that knows how to talk to the API;
// this factory only keeps the injection surface the rest of the app already uses.
export function createHttpClient(options = {}) {
  const gateway = createGateway(options);
  return {
    send: gateway.send,
    get: gateway.get,
    post: gateway.post,
    put: gateway.put,
    patch: gateway.patch,
    delete: gateway.delete,
  };
}