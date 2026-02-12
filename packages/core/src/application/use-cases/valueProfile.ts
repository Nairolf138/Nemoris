import type { ValueProfile } from '../../domain/entities.js';
import type { MemoryRepository, NarrativeNodeRepository, ValueProfileRepository } from '../../repositories/contracts.js';
import {
  VISIBILITIES,
  ValidationError,
  defaultedMetadata,
  ensureEnum,
  ensureRelatedIds,
  ensureRequiredString,
  ensureScoreRange,
} from '../validation.js';

export interface CreateValueProfileInput {
  id?: string;
  owner_id: string;
  visibility: ValueProfile['visibility'];
  created_at?: string;
  updated_at?: string;
  profile_label: string;
  age_range?: string;
  values: ValueProfile['values'];
  current_version_number: number;
  evidence_memory_ids: string[];
  narrative_node_ids: string[];
}

export type UpdateValueProfileInput = Partial<Omit<CreateValueProfileInput, 'owner_id' | 'created_at'>>;

export interface ValueProfileUseCaseDeps {
  valueProfileRepository: ValueProfileRepository;
  memoryRepository: MemoryRepository;
  narrativeNodeRepository: NarrativeNodeRepository;
}

const validateValues = (values: ValueProfile['values']): ValueProfile['values'] => {
  if (!values.length) {
    throw new ValidationError('Field "values" must not be empty.');
  }
  return values.map((value, index) => ({
    ...value,
    value_id: ensureRequiredString(value.value_id, `values[${index}].value_id`),
    label: ensureRequiredString(value.label, `values[${index}].label`),
    score: ensureScoreRange(value.score, `values[${index}].score`, 0, 100),
  }));
};

const validateCreateValueProfile = async (
  deps: ValueProfileUseCaseDeps,
  input: CreateValueProfileInput,
): Promise<ValueProfile> => {
  const metadata = defaultedMetadata(input);
  ensureRequiredString(input.profile_label, 'profile_label');
  if (!Number.isInteger(input.current_version_number) || input.current_version_number < 1) {
    throw new ValidationError('Field "current_version_number" must be an integer >= 1.');
  }

  return {
    ...metadata,
    profile_label: input.profile_label,
    age_range: input.age_range,
    values: validateValues(input.values),
    current_version_number: input.current_version_number,
    evidence_memory_ids: await ensureRelatedIds(input.evidence_memory_ids, 'evidence_memory_ids', deps.memoryRepository.existsByIds),
    narrative_node_ids: await ensureRelatedIds(input.narrative_node_ids, 'narrative_node_ids', deps.narrativeNodeRepository.existsByIds),
  };
};

const validateUpdateValueProfile = async (
  deps: ValueProfileUseCaseDeps,
  input: UpdateValueProfileInput,
): Promise<Partial<ValueProfile>> => {
  const patch: Partial<ValueProfile> = { updated_at: new Date().toISOString() };

  if (input.visibility !== undefined) patch.visibility = ensureEnum(input.visibility, VISIBILITIES, 'visibility');
  if (input.profile_label !== undefined) patch.profile_label = ensureRequiredString(input.profile_label, 'profile_label');
  if (input.age_range !== undefined) patch.age_range = input.age_range;
  if (input.values !== undefined) patch.values = validateValues(input.values);
  if (input.current_version_number !== undefined) {
    if (!Number.isInteger(input.current_version_number) || input.current_version_number < 1) {
      throw new ValidationError('Field "current_version_number" must be an integer >= 1.');
    }
    patch.current_version_number = input.current_version_number;
  }
  if (input.evidence_memory_ids !== undefined) {
    patch.evidence_memory_ids = await ensureRelatedIds(input.evidence_memory_ids, 'evidence_memory_ids', deps.memoryRepository.existsByIds);
  }
  if (input.narrative_node_ids !== undefined) {
    patch.narrative_node_ids = await ensureRelatedIds(input.narrative_node_ids, 'narrative_node_ids', deps.narrativeNodeRepository.existsByIds);
  }

  return patch;
};

export const createValueProfile = async (
  deps: ValueProfileUseCaseDeps,
  input: CreateValueProfileInput,
): Promise<ValueProfile> => deps.valueProfileRepository.create(await validateCreateValueProfile(deps, input));

export const updateValueProfile = async (
  deps: ValueProfileUseCaseDeps,
  id: string,
  input: UpdateValueProfileInput,
): Promise<ValueProfile | null> => deps.valueProfileRepository.update(id, await validateUpdateValueProfile(deps, input));

export const deleteValueProfile = async (deps: ValueProfileUseCaseDeps, id: string): Promise<boolean> =>
  deps.valueProfileRepository.delete(id);

export const listValueProfiles = async (
  deps: Pick<ValueProfileUseCaseDeps, 'valueProfileRepository'>,
  ownerId: string,
): Promise<ValueProfile[]> => {
  ensureRequiredString(ownerId, 'ownerId');
  return deps.valueProfileRepository.listByOwner(ownerId);
};
