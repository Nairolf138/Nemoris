import type { ConsentScope } from '@capsule/core';
import { type ExportFormat } from './export-service.js';
import { ValidationError } from './errors.js';

export interface Credentials {
  email: string;
  password: string;
}

interface ExportPayload {
  format?: ExportFormat;
  owner_id?: string;
}


const CONSENT_SCOPES: ConsentScope[] = ['data_export', 'post_mortem_transmission', 'posthumous_visibility'];

export type DataCollection =
  | 'memories'
  | 'beliefs'
  | 'lessons'
  | 'value_profiles'
  | 'legacy_messages'
  | 'beneficiaries'
  | 'narrative_nodes'
  | 'narrative_edges';

type SortOrder = 'asc' | 'desc';

type DataCollectionSortBy = {
  memories: 'occurred_at' | 'created_at' | 'updated_at';
  beliefs: 'created_at' | 'updated_at';
  lessons: 'created_at' | 'updated_at';
  value_profiles: 'created_at' | 'updated_at';
  legacy_messages: 'trigger_at' | 'created_at' | 'updated_at';
  beneficiaries: 'created_at' | 'updated_at';
  narrative_nodes: 'created_at' | 'updated_at';
  narrative_edges: 'created_at' | 'updated_at';
};

export type DataListSortBy<C extends DataCollection> = DataCollectionSortBy[C];

export interface DataListQueryDto<C extends DataCollection = DataCollection> {
  limit: number;
  offset: number;
  cursor?: string;
  sort: DataListSortBy<C>;
  order: SortOrder;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

const DEFAULT_SORT_BY: { [K in DataCollection]: DataListSortBy<K> } = {
  memories: 'occurred_at',
  beliefs: 'created_at',
  lessons: 'created_at',
  value_profiles: 'created_at',
  legacy_messages: 'trigger_at',
  beneficiaries: 'created_at',
  narrative_nodes: 'created_at',
  narrative_edges: 'created_at',
};

const allowedSortBy: { [K in DataCollection]: readonly DataListSortBy<K>[] } = {
  memories: ['occurred_at', 'created_at', 'updated_at'],
  beliefs: ['created_at', 'updated_at'],
  lessons: ['created_at', 'updated_at'],
  value_profiles: ['created_at', 'updated_at'],
  legacy_messages: ['trigger_at', 'created_at', 'updated_at'],
  beneficiaries: ['created_at', 'updated_at'],
  narrative_nodes: ['created_at', 'updated_at'],
  narrative_edges: ['created_at', 'updated_at'],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertAllowedKeys = (payload: Record<string, unknown>, allowedKeys: readonly string[]): void => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      throw new ValidationError('INVALID_PAYLOAD');
    }
  }
};

const parseInteger = (value: string | null): number | undefined => {
  if (value === null) {
    return undefined;
  }
  if (!/^\d+$/.test(value)) {
    throw new ValidationError('INVALID_QUERY_PARAMS');
  }
  return Number(value);
};

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const parseCredentials = (body: unknown): Credentials => {
  if (!isRecord(body)) {
    throw new ValidationError('INVALID_PAYLOAD');
  }

  assertAllowedKeys(body, ['email', 'password']);

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new ValidationError('INVALID_PAYLOAD');
  }

  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError('INVALID_EMAIL');
  }

  if (password.length < MIN_PASSWORD_LENGTH || !PASSWORD_COMPLEXITY_REGEX.test(password)) {
    throw new ValidationError('WEAK_PASSWORD');
  }

  return { email, password };
};

export const parseExportPayload = (body: unknown): ExportPayload => {
  if (body === undefined || body === null) {
    return { format: 'json' };
  }

  if (!isRecord(body)) {
    throw new ValidationError('INVALID_PAYLOAD');
  }

  assertAllowedKeys(body, ['format', 'owner_id']);

  const format = body.format;
  if (format !== undefined && format !== 'json' && format !== 'pdf') {
    throw new ValidationError('INVALID_EXPORT_FORMAT');
  }

  const ownerId = body.owner_id;
  if (ownerId !== undefined && (typeof ownerId !== 'string' || ownerId.trim().length === 0)) {
    throw new ValidationError('INVALID_OWNER_SCOPE');
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
    throw new ValidationError('INVALID_OWNER_SCOPE');
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError('INVALID_OWNER_SCOPE');
  }

  return normalized;
};


export const parseConsentPayload = (body: unknown): { owner_id: string; scope: ConsentScope; legal_basis: string } => {
  if (!isRecord(body)) {
    throw new ValidationError('INVALID_PAYLOAD');
  }

  assertAllowedKeys(body, ['owner_id', 'scope', 'legal_basis']);

  const owner_id = parseOwnerScope(body.owner_id);
  if (!owner_id) {
    throw new ValidationError('OWNER_SCOPE_REQUIRED');
  }

  if (typeof body.scope !== 'string' || !CONSENT_SCOPES.includes(body.scope as ConsentScope)) {
    throw new ValidationError('INVALID_PAYLOAD');
  }

  if (typeof body.legal_basis !== 'string' || body.legal_basis.trim().length === 0) {
    throw new ValidationError('INVALID_PAYLOAD');
  }

  return { owner_id, scope: body.scope as ConsentScope, legal_basis: body.legal_basis.trim() };
};

export const parseDataListQuery = <C extends DataCollection>(collection: C, path: string): DataListQueryDto<C> => {
  const [, queryString] = path.split('?');
  const params = new URLSearchParams(queryString ?? '');

  const limit = parseInteger(params.get('limit')) ?? DEFAULT_LIMIT;
  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw new ValidationError('INVALID_QUERY_PARAMS');
  }

  const offsetParam = parseInteger(params.get('offset'));
  const cursorParam = params.get('cursor');
  let offset = offsetParam ?? 0;

  if (cursorParam !== null) {
    const decodedCursor = parseInteger(cursorParam);
    if (decodedCursor === undefined) {
      throw new ValidationError('INVALID_QUERY_PARAMS');
    }
    if (offsetParam !== undefined && offsetParam !== decodedCursor) {
      throw new ValidationError('INVALID_QUERY_PARAMS');
    }
    offset = decodedCursor;
  }

  if (offset < 0) {
    throw new ValidationError('INVALID_QUERY_PARAMS');
  }

  const sortParam = params.get('sort') as DataListSortBy<C> | null;
  const sort = sortParam ?? DEFAULT_SORT_BY[collection];
  if (!allowedSortBy[collection].includes(sort)) {
    throw new ValidationError('INVALID_QUERY_PARAMS');
  }

  const orderParam = params.get('order');
  if (orderParam !== null && orderParam !== 'asc' && orderParam !== 'desc') {
    throw new ValidationError('INVALID_QUERY_PARAMS');
  }

  return {
    limit,
    offset,
    cursor: cursorParam ?? undefined,
    sort,
    order: orderParam ?? 'desc',
  };
};

export const getDefaultSortBy = <C extends DataCollection>(collection: C): DataListSortBy<C> => DEFAULT_SORT_BY[collection];
