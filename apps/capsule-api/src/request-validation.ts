import { type ExportFormat } from './export-service.js';

export interface Credentials {
  email: string;
  password: string;
}

interface ExportPayload {
  format?: ExportFormat;
  owner_id?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertAllowedKeys = (payload: Record<string, unknown>, allowedKeys: readonly string[]): void => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      throw new Error('INVALID_PAYLOAD');
    }
  }
};

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const parseCredentials = (body: unknown): Credentials => {
  if (!isRecord(body)) {
    throw new Error('INVALID_PAYLOAD');
  }

  assertAllowedKeys(body, ['email', 'password']);

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new Error('INVALID_PAYLOAD');
  }

  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!EMAIL_REGEX.test(email)) {
    throw new Error('INVALID_EMAIL');
  }

  if (password.length < MIN_PASSWORD_LENGTH || !PASSWORD_COMPLEXITY_REGEX.test(password)) {
    throw new Error('WEAK_PASSWORD');
  }

  return { email, password };
};

export const parseExportPayload = (body: unknown): ExportPayload => {
  if (body === undefined || body === null) {
    return { format: 'json' };
  }

  if (!isRecord(body)) {
    throw new Error('INVALID_PAYLOAD');
  }

  assertAllowedKeys(body, ['format', 'owner_id']);

  const format = body.format;
  if (format !== undefined && format !== 'json' && format !== 'pdf') {
    throw new Error('INVALID_EXPORT_FORMAT');
  }

  const ownerId = body.owner_id;
  if (ownerId !== undefined && (typeof ownerId !== 'string' || ownerId.trim().length === 0)) {
    throw new Error('INVALID_OWNER_SCOPE');
  }

  return {
    format: format ?? 'json',
    owner_id: typeof ownerId === 'string' ? ownerId.trim() : undefined,
  };
};

export const parseOwnerScope = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('INVALID_OWNER_SCOPE');
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error('INVALID_OWNER_SCOPE');
  }

  return normalized;
};
