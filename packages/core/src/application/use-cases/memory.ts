import type { Memory } from '../../domain/entities.js';
import type { BeliefRepository, LessonRepository, MemoryRepository, NarrativeNodeRepository, ValueProfileRepository } from '../../repositories/contracts.js';
import {
  VISIBILITIES,
  defaultedMetadata,
  ensureEnum,
  ensureOptionalEnum,
  ensureRelatedIds,
  ensureRequiredString,
} from '../validation.js';

const MEMORY_TYPES = ['event', 'document', 'media', 'note'] as const;

type MemoryType = (typeof MEMORY_TYPES)[number];

export interface CreateMemoryInput {
  id?: string;
  owner_id: string;
  visibility: Memory['visibility'];
  created_at?: string;
  updated_at?: string;
  occurred_at: string;
  title: string;
  description?: string;
  memory_type?: MemoryType;
  related_belief_ids: string[];
  related_lesson_ids: string[];
  related_value_profile_ids: string[];
  related_narrative_node_ids: string[];
}

export type UpdateMemoryInput = Partial<Omit<CreateMemoryInput, 'owner_id' | 'created_at'>>;

export interface MemoryUseCaseDeps {
  memoryRepository: MemoryRepository;
  beliefRepository: BeliefRepository;
  lessonRepository: LessonRepository;
  valueProfileRepository: ValueProfileRepository;
  narrativeNodeRepository: NarrativeNodeRepository;
}

const validateCreateMemory = async (deps: MemoryUseCaseDeps, input: CreateMemoryInput): Promise<Memory> => {
  const metadata = defaultedMetadata(input);
  ensureRequiredString(input.occurred_at, 'occurred_at');
  ensureRequiredString(input.title, 'title');

  const memory_type = ensureOptionalEnum(input.memory_type, MEMORY_TYPES, 'memory_type');

  return {
    ...metadata,
    occurred_at: input.occurred_at,
    title: input.title,
    description: input.description,
    memory_type,
    related_belief_ids: await ensureRelatedIds(input.related_belief_ids, 'related_belief_ids', deps.beliefRepository.existsByIds),
    related_lesson_ids: await ensureRelatedIds(input.related_lesson_ids, 'related_lesson_ids', deps.lessonRepository.existsByIds),
    related_value_profile_ids: await ensureRelatedIds(
      input.related_value_profile_ids,
      'related_value_profile_ids',
      deps.valueProfileRepository.existsByIds,
    ),
    related_narrative_node_ids: await ensureRelatedIds(
      input.related_narrative_node_ids,
      'related_narrative_node_ids',
      deps.narrativeNodeRepository.existsByIds,
    ),
  };
};

const validateUpdateMemory = async (deps: MemoryUseCaseDeps, input: UpdateMemoryInput): Promise<Partial<Memory>> => {
  const patch: Partial<Memory> = { updated_at: new Date().toISOString() };

  if (input.visibility !== undefined) {
    patch.visibility = ensureEnum(input.visibility, VISIBILITIES, 'visibility');
  }
  if (input.occurred_at !== undefined) {
    patch.occurred_at = ensureRequiredString(input.occurred_at, 'occurred_at');
  }
  if (input.title !== undefined) {
    patch.title = ensureRequiredString(input.title, 'title');
  }
  if (input.memory_type !== undefined) {
    patch.memory_type = ensureOptionalEnum(input.memory_type, MEMORY_TYPES, 'memory_type');
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.related_belief_ids !== undefined) {
    patch.related_belief_ids = await ensureRelatedIds(input.related_belief_ids, 'related_belief_ids', deps.beliefRepository.existsByIds);
  }
  if (input.related_lesson_ids !== undefined) {
    patch.related_lesson_ids = await ensureRelatedIds(input.related_lesson_ids, 'related_lesson_ids', deps.lessonRepository.existsByIds);
  }
  if (input.related_value_profile_ids !== undefined) {
    patch.related_value_profile_ids = await ensureRelatedIds(
      input.related_value_profile_ids,
      'related_value_profile_ids',
      deps.valueProfileRepository.existsByIds,
    );
  }
  if (input.related_narrative_node_ids !== undefined) {
    patch.related_narrative_node_ids = await ensureRelatedIds(
      input.related_narrative_node_ids,
      'related_narrative_node_ids',
      deps.narrativeNodeRepository.existsByIds,
    );
  }

  return patch;
};

export const createMemory = async (deps: MemoryUseCaseDeps, input: CreateMemoryInput): Promise<Memory> => {
  const memory = await validateCreateMemory(deps, input);
  return deps.memoryRepository.create(memory);
};

export const updateMemory = async (
  deps: MemoryUseCaseDeps,
  id: string,
  input: UpdateMemoryInput,
): Promise<Memory | null> => deps.memoryRepository.update(id, await validateUpdateMemory(deps, input));

export const deleteMemory = async (deps: MemoryUseCaseDeps, id: string): Promise<boolean> => deps.memoryRepository.delete(id);

export const listMemories = async (deps: Pick<MemoryUseCaseDeps, 'memoryRepository'>, ownerId: string): Promise<Memory[]> => {
  ensureRequiredString(ownerId, 'ownerId');
  return deps.memoryRepository.listByOwner(ownerId);
};
