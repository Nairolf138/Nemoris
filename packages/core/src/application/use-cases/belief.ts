import type { Belief } from '../../domain/entities.js';
import type { BeliefRepository, LessonRepository, MemoryRepository } from '../../repositories/contracts.js';
import {
  VISIBILITIES,
  ValidationError,
  defaultedMetadata,
  ensureEnum,
  ensureRelatedIds,
  ensureRequiredString,
  ensureScoreRange,
} from '../validation.js';

const BELIEF_STATUSES = ['active', 'revised', 'discarded'] as const;

export interface CreateBeliefInput {
  id?: string;
  owner_id: string;
  visibility: Belief['visibility'];
  created_at?: string;
  updated_at?: string;
  belief_key: string;
  statement: string;
  confidence_score?: number;
  status: Belief['status'];
  current_version_number: number;
  evidence_memory_ids: string[];
  related_lesson_ids: string[];
  previous_belief_id?: string;
}

export type UpdateBeliefInput = Partial<Omit<CreateBeliefInput, 'owner_id' | 'created_at'>>;

export interface BeliefUseCaseDeps {
  beliefRepository: BeliefRepository;
  memoryRepository: MemoryRepository;
  lessonRepository: LessonRepository;
}

const validateBeliefCreate = async (deps: BeliefUseCaseDeps, input: CreateBeliefInput): Promise<Belief> => {
  const metadata = defaultedMetadata(input);
  ensureRequiredString(input.belief_key, 'belief_key');
  ensureRequiredString(input.statement, 'statement');
  ensureEnum(input.status, BELIEF_STATUSES, 'status');
  if (!Number.isInteger(input.current_version_number) || input.current_version_number < 1) {
    throw new ValidationError('Field "current_version_number" must be an integer >= 1.');
  }
  if (input.confidence_score !== undefined) {
    ensureScoreRange(input.confidence_score, 'confidence_score', 0, 1);
  }
  if (input.previous_belief_id && !(await deps.beliefRepository.getById(input.previous_belief_id))) {
    throw new ValidationError('Field "previous_belief_id" must reference an existing belief.');
  }

  return {
    ...metadata,
    belief_key: input.belief_key,
    statement: input.statement,
    confidence_score: input.confidence_score,
    status: input.status,
    current_version_number: input.current_version_number,
    evidence_memory_ids: await ensureRelatedIds(input.evidence_memory_ids, 'evidence_memory_ids', deps.memoryRepository.existsByIds),
    related_lesson_ids: await ensureRelatedIds(input.related_lesson_ids, 'related_lesson_ids', deps.lessonRepository.existsByIds),
    previous_belief_id: input.previous_belief_id,
  };
};

const validateBeliefUpdate = async (deps: BeliefUseCaseDeps, input: UpdateBeliefInput): Promise<Partial<Belief>> => {
  const patch: Partial<Belief> = { updated_at: new Date().toISOString() };

  if (input.visibility !== undefined) patch.visibility = ensureEnum(input.visibility, VISIBILITIES, 'visibility');
  if (input.belief_key !== undefined) patch.belief_key = ensureRequiredString(input.belief_key, 'belief_key');
  if (input.statement !== undefined) patch.statement = ensureRequiredString(input.statement, 'statement');
  if (input.status !== undefined) patch.status = ensureEnum(input.status, BELIEF_STATUSES, 'status');
  if (input.current_version_number !== undefined) {
    if (!Number.isInteger(input.current_version_number) || input.current_version_number < 1) {
      throw new ValidationError('Field "current_version_number" must be an integer >= 1.');
    }
    patch.current_version_number = input.current_version_number;
  }
  if (input.confidence_score !== undefined) {
    patch.confidence_score = ensureScoreRange(input.confidence_score, 'confidence_score', 0, 1);
  }
  if (input.previous_belief_id !== undefined) {
    if (input.previous_belief_id && !(await deps.beliefRepository.getById(input.previous_belief_id))) {
      throw new ValidationError('Field "previous_belief_id" must reference an existing belief.');
    }
    patch.previous_belief_id = input.previous_belief_id;
  }
  if (input.evidence_memory_ids !== undefined) {
    patch.evidence_memory_ids = await ensureRelatedIds(input.evidence_memory_ids, 'evidence_memory_ids', deps.memoryRepository.existsByIds);
  }
  if (input.related_lesson_ids !== undefined) {
    patch.related_lesson_ids = await ensureRelatedIds(input.related_lesson_ids, 'related_lesson_ids', deps.lessonRepository.existsByIds);
  }

  return patch;
};

export const createBelief = async (deps: BeliefUseCaseDeps, input: CreateBeliefInput): Promise<Belief> => {
  const belief = await validateBeliefCreate(deps, input);
  return deps.beliefRepository.create(belief);
};

export const updateBelief = async (
  deps: BeliefUseCaseDeps,
  id: string,
  input: UpdateBeliefInput,
): Promise<Belief | null> => deps.beliefRepository.update(id, await validateBeliefUpdate(deps, input));

export const deleteBelief = async (deps: BeliefUseCaseDeps, id: string): Promise<boolean> => deps.beliefRepository.delete(id);

export const listBeliefs = async (deps: Pick<BeliefUseCaseDeps, 'beliefRepository'>, ownerId: string): Promise<Belief[]> => {
  ensureRequiredString(ownerId, 'ownerId');
  return deps.beliefRepository.listByOwner(ownerId);
};
