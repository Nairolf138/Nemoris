import type { Lesson } from '../../domain/entities.js';
import type { BeliefRepository, LessonRepository, MemoryRepository, ValueProfileRepository } from '../../repositories/contracts.js';
import { VISIBILITIES, defaultedMetadata, ensureEnum, ensureOptionalEnum, ensureRelatedIds, ensureRequiredString } from '../validation.js';

const LESSON_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export interface CreateLessonInput {
  id?: string;
  owner_id: string;
  visibility: Lesson['visibility'];
  created_at?: string;
  updated_at?: string;
  title: string;
  context?: string;
  lesson_text: string;
  severity?: Lesson['severity'];
  source_memory_ids: string[];
  linked_belief_ids: string[];
  linked_value_profile_ids: string[];
}

export type UpdateLessonInput = Partial<Omit<CreateLessonInput, 'owner_id' | 'created_at'>>;

export interface LessonUseCaseDeps {
  lessonRepository: LessonRepository;
  memoryRepository: MemoryRepository;
  beliefRepository: BeliefRepository;
  valueProfileRepository: ValueProfileRepository;
}

const validateCreateLesson = async (deps: LessonUseCaseDeps, input: CreateLessonInput): Promise<Lesson> => {
  const metadata = defaultedMetadata(input);
  ensureRequiredString(input.title, 'title');
  ensureRequiredString(input.lesson_text, 'lesson_text');

  return {
    ...metadata,
    title: input.title,
    context: input.context,
    lesson_text: input.lesson_text,
    severity: ensureOptionalEnum(input.severity, LESSON_SEVERITIES, 'severity'),
    source_memory_ids: await ensureRelatedIds(input.source_memory_ids, 'source_memory_ids', deps.memoryRepository.existsByIds),
    linked_belief_ids: await ensureRelatedIds(input.linked_belief_ids, 'linked_belief_ids', deps.beliefRepository.existsByIds),
    linked_value_profile_ids: await ensureRelatedIds(
      input.linked_value_profile_ids,
      'linked_value_profile_ids',
      deps.valueProfileRepository.existsByIds,
    ),
  };
};

const validateUpdateLesson = async (deps: LessonUseCaseDeps, input: UpdateLessonInput): Promise<Partial<Lesson>> => {
  const patch: Partial<Lesson> = { updated_at: new Date().toISOString() };

  if (input.visibility !== undefined) patch.visibility = ensureEnum(input.visibility, VISIBILITIES, 'visibility');
  if (input.title !== undefined) patch.title = ensureRequiredString(input.title, 'title');
  if (input.context !== undefined) patch.context = input.context;
  if (input.lesson_text !== undefined) patch.lesson_text = ensureRequiredString(input.lesson_text, 'lesson_text');
  if (input.severity !== undefined) patch.severity = ensureOptionalEnum(input.severity, LESSON_SEVERITIES, 'severity');
  if (input.source_memory_ids !== undefined) {
    patch.source_memory_ids = await ensureRelatedIds(input.source_memory_ids, 'source_memory_ids', deps.memoryRepository.existsByIds);
  }
  if (input.linked_belief_ids !== undefined) {
    patch.linked_belief_ids = await ensureRelatedIds(input.linked_belief_ids, 'linked_belief_ids', deps.beliefRepository.existsByIds);
  }
  if (input.linked_value_profile_ids !== undefined) {
    patch.linked_value_profile_ids = await ensureRelatedIds(
      input.linked_value_profile_ids,
      'linked_value_profile_ids',
      deps.valueProfileRepository.existsByIds,
    );
  }

  return patch;
};

export const createLesson = async (deps: LessonUseCaseDeps, input: CreateLessonInput): Promise<Lesson> => {
  const lesson = await validateCreateLesson(deps, input);
  return deps.lessonRepository.create(lesson);
};

export const updateLesson = async (
  deps: LessonUseCaseDeps,
  id: string,
  input: UpdateLessonInput,
): Promise<Lesson | null> => deps.lessonRepository.update(id, await validateUpdateLesson(deps, input));

export const deleteLesson = async (deps: LessonUseCaseDeps, id: string): Promise<boolean> => deps.lessonRepository.delete(id);

export const listLessons = async (deps: Pick<LessonUseCaseDeps, 'lessonRepository'>, ownerId: string): Promise<Lesson[]> => {
  ensureRequiredString(ownerId, 'ownerId');
  return deps.lessonRepository.listByOwner(ownerId);
};
