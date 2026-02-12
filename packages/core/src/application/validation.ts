import type { Visibility } from '../domain/entities.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const VISIBILITIES: Visibility[] = ['private', 'trusted_circle', 'public', 'posthumous'];

export const ensureRequiredString = (value: string | undefined, field: string): string => {
  if (!value || !value.trim()) {
    throw new ValidationError(`Field "${field}" is required.`);
  }
  return value;
};

export const ensureEnum = <T extends string>(value: T | undefined, allowed: readonly T[], field: string): T => {
  if (!value || !allowed.includes(value)) {
    throw new ValidationError(`Field "${field}" must be one of: ${allowed.join(', ')}.`);
  }
  return value;
};

export const ensureOptionalEnum = <T extends string>(value: T | undefined, allowed: readonly T[], field: string): T | undefined => {
  if (!value) {
    return value;
  }
  if (!allowed.includes(value)) {
    throw new ValidationError(`Field "${field}" must be one of: ${allowed.join(', ')}.`);
  }
  return value;
};

export const ensureScoreRange = (value: number, field: string, min: number, max: number): number => {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(`Field "${field}" must be between ${min} and ${max}.`);
  }
  return value;
};

export const uniqueIds = (ids: string[], field: string): string[] => {
  for (const id of ids) {
    if (!id.trim()) {
      throw new ValidationError(`Field "${field}" cannot contain empty identifiers.`);
    }
  }
  return [...new Set(ids)];
};

export const defaultedMetadata = (input: {
  id?: string;
  created_at?: string;
  updated_at?: string;
  owner_id: string;
  visibility: Visibility;
}) => {
  const now = new Date().toISOString();
  return {
    id: input.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
    owner_id: ensureRequiredString(input.owner_id, 'owner_id'),
    visibility: ensureEnum(input.visibility, VISIBILITIES, 'visibility'),
  };
};

export const ensureRelatedIds = async (
  ids: string[],
  label: string,
  existsByIds: (ids: string[]) => Promise<boolean>,
): Promise<string[]> => {
  const normalized = uniqueIds(ids, label);
  if (normalized.length === 0) {
    return normalized;
  }
  if (!(await existsByIds(normalized))) {
    throw new ValidationError(`Field "${label}" contains unknown references.`);
  }
  return normalized;
};
