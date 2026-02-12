import type { ApiErrorPayload } from './models/contracts.js';

export const API_ERROR_CODES = {
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_EXPORT_FORMAT: 'INVALID_EXPORT_FORMAT',
  INVALID_OWNER_SCOPE: 'INVALID_OWNER_SCOPE',
  INVALID_QUERY_PARAMS: 'INVALID_QUERY_PARAMS',
  OWNER_SCOPE_REQUIRED: 'OWNER_SCOPE_REQUIRED',
  DOMAIN_VALIDATION_ERROR: 'DOMAIN_VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  EXPORT_NOT_FOUND: 'EXPORT_NOT_FOUND',
  EMAIL_ALREADY_USED: 'EMAIL_ALREADY_USED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export class CapsuleApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryAfterMs?: number;
  public readonly details?: Record<string, unknown>;

  public constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message ?? payload.error);
    this.name = 'CapsuleApiError';
    this.status = status;
    this.code = payload.error;
    this.retryAfterMs = payload.retry_after_ms;
    this.details = payload.details;
  }

  public is(code: ApiErrorCode): boolean {
    return this.code === code;
  }
}

export const isApiErrorPayload = (value: unknown): value is ApiErrorPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ApiErrorPayload>;
  return typeof payload.error === 'string';
};

export const toApiError = (status: number, payload: unknown): CapsuleApiError => {
  if (isApiErrorPayload(payload)) {
    return new CapsuleApiError(status, payload);
  }

  return new CapsuleApiError(status, {
    error: API_ERROR_CODES.INTERNAL_ERROR,
    message: 'Unexpected error payload format',
  });
};
