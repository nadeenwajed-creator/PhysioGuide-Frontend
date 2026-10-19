// Keeps raw backend error details out of the interface.
export class AuthServiceError extends Error {
  constructor(code = 'unexpected', fieldErrors = {}) {
    super(code);
    this.name = 'AuthServiceError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

// Converts errors into codes that the form can translate.
export function normalizeAuthError(error) {
  if (error instanceof AuthServiceError) return error;
  if (error instanceof TypeError) return new AuthServiceError('network');
  return new AuthServiceError('unexpected');
}
