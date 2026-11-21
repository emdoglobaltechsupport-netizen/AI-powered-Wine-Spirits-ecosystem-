/** Application error with a stable machine-readable code and HTTP status. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(status: number, code: string, message: string, details?: unknown, expose = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}

export const badRequest = (message = 'Invalid request', details?: unknown) =>
  new AppError(400, 'invalid_request', message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message);
export const forbidden = (message = 'Not permitted', details?: unknown) =>
  new AppError(403, 'forbidden', message, details);
export const notFound = (message = 'Resource not found') =>
  new AppError(404, 'not_found', message);
export const conflict = (message = 'Resource conflict', details?: unknown) =>
  new AppError(409, 'conflict', message, details);
export const payloadTooLarge = (message = 'Payload too large') =>
  new AppError(413, 'payload_too_large', message);
export const tooMany = (message = 'Too many requests') =>
  new AppError(429, 'rate_limited', message);
export const precondition = (message = 'Precondition required', hint?: string) =>
  new AppError(428, 'precondition_required', message, hint ? { hint } : undefined);
export const internal = (message = 'Internal server error') =>
  new AppError(500, 'internal_error', message, undefined, false);
