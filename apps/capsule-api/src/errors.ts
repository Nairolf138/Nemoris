import { ValidationError as CoreValidationError } from '@capsule/core';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_INVALID'
  | 'SESSION_NOT_FOUND'
  | 'EMAIL_ALREADY_USED'
  | 'RECOVERY_PROOF_REQUIRED'
  | 'RECOVERY_SENSITIVE_ACTION_BLOCKED'
  | 'INVALID_PAYLOAD'
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'INVALID_EXPORT_FORMAT'
  | 'INVALID_OWNER_SCOPE'
  | 'INVALID_QUERY_PARAMS'
  | 'OWNER_SCOPE_REQUIRED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'EXPORT_NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'NOT_FOUND'
  | 'DOMAIN_VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiErrorPayload {
  error: ApiErrorCode;
  message?: string;
  retry_after_ms?: number;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    public readonly httpStatus: number,
    public readonly options: {
      message?: string;
      retryAfterMs?: number;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(options.message ?? code);
    this.name = this.constructor.name;
  }

  public toPayload(): ApiErrorPayload {
    return {
      error: this.code,
      ...(this.options.message ? { message: this.options.message } : {}),
      ...(this.options.retryAfterMs !== undefined ? { retry_after_ms: this.options.retryAfterMs } : {}),
      ...(this.options.details ? { details: this.options.details } : {}),
    };
  }
}

export class AuthError extends ApiError {
  public constructor(code: Extract<ApiErrorCode, 'UNAUTHENTICATED' | 'INVALID_CREDENTIALS' | 'SESSION_INVALID' | 'SESSION_NOT_FOUND'>) {
    super(code, 401);
  }
}

export class ValidationError extends ApiError {
  public constructor(
    code: Extract<
      ApiErrorCode,
      | 'INVALID_PAYLOAD'
      | 'INVALID_EMAIL'
      | 'WEAK_PASSWORD'
      | 'INVALID_EXPORT_FORMAT'
      | 'INVALID_OWNER_SCOPE'
      | 'INVALID_QUERY_PARAMS'
      | 'OWNER_SCOPE_REQUIRED'
      | 'DOMAIN_VALIDATION_ERROR'
      | 'RECOVERY_PROOF_REQUIRED'
    >,
    options?: { message?: string; details?: Record<string, unknown> },
  ) {
    super(code, 400, options);
  }
}

export class ForbiddenError extends ApiError {
  public constructor(code: Extract<ApiErrorCode, 'FORBIDDEN'> = 'FORBIDDEN') {
    super(code, 403);
  }
}

export class RateLimitedError extends ApiError {
  public constructor(retryAfterMs?: number) {
    super('RATE_LIMITED', 429, { retryAfterMs });
  }
}

export class NotFoundError extends ApiError {
  public constructor(code: Extract<ApiErrorCode, 'EXPORT_NOT_FOUND' | 'RESOURCE_NOT_FOUND' | 'NOT_FOUND'> = 'NOT_FOUND') {
    super(code, 404);
  }
}

export class ConflictError extends ApiError {
  public constructor(code: Extract<ApiErrorCode, 'EMAIL_ALREADY_USED'> = 'EMAIL_ALREADY_USED') {
    super(code, 409);
  }
}

const legacyToApiError = (error: Error): ApiError | undefined => {
  switch (error.message) {
    case 'UNAUTHENTICATED':
    case 'INVALID_CREDENTIALS':
    case 'SESSION_INVALID':
    case 'SESSION_NOT_FOUND':
      return new AuthError(error.message);
    case 'INVALID_PAYLOAD':
    case 'INVALID_EMAIL':
    case 'WEAK_PASSWORD':
    case 'INVALID_EXPORT_FORMAT':
    case 'INVALID_OWNER_SCOPE':
    case 'INVALID_QUERY_PARAMS':
    case 'OWNER_SCOPE_REQUIRED':
    case 'RECOVERY_PROOF_REQUIRED':
      return new ValidationError(error.message);
    case 'FORBIDDEN':
      return new ForbiddenError();
    case 'RATE_LIMITED':
      return new RateLimitedError();
    case 'EMAIL_ALREADY_USED':
      return new ConflictError();
    case 'EXPORT_NOT_FOUND':
      return new NotFoundError('EXPORT_NOT_FOUND');
    case 'RESOURCE_NOT_FOUND':
      return new NotFoundError('RESOURCE_NOT_FOUND');
    case 'NOT_FOUND':
      return new NotFoundError('NOT_FOUND');
    default:
      return undefined;
  }
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof CoreValidationError) {
    return new ValidationError('DOMAIN_VALIDATION_ERROR', { message: error.message });
  }

  if (error instanceof Error) {
    return legacyToApiError(error) ?? new ApiError('INTERNAL_ERROR', 500);
  }

  return new ApiError('INTERNAL_ERROR', 500);
};
