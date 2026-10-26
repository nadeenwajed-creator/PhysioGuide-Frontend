export class ServiceError extends Error {
  constructor(code = 'unexpected', { status = 0, fields = {} } = {}) {
    super(code);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function normalizeServiceError(error) {
  if (error instanceof ServiceError) return error;
  if (error?.code) return new ServiceError(error.code, { fields: error.fields || error.fieldErrors });
  return new ServiceError(error?.name === 'AbortError' ? 'cancelled' : 'network');
}
