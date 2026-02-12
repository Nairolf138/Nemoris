import type { LegacyMessage } from '../../domain/entities.js';
import type {
  BeliefRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  NarrativeNodeRepository,
  ValueProfileRepository,
} from '../../repositories/contracts.js';
import { VISIBILITIES, defaultedMetadata, ensureEnum, ensureRelatedIds, ensureRequiredString } from '../validation.js';

const TRIGGER_TYPES = ['manual', 'date', 'inactivity', 'verified_death'] as const;
const DELIVERY_STATUS = ['draft', 'armed', 'sent', 'revoked'] as const;

export interface CreateLegacyMessageInput {
  id?: string;
  owner_id: string;
  visibility: LegacyMessage['visibility'];
  created_at?: string;
  updated_at?: string;
  title: string;
  message: string;
  trigger_type: LegacyMessage['trigger_type'];
  trigger_at?: string;
  recipient_ids: string[];
  attachment_memory_ids: string[];
  related_belief_ids: string[];
  related_lesson_ids: string[];
  related_value_profile_ids: string[];
  related_narrative_node_ids: string[];
  delivery_status: LegacyMessage['delivery_status'];
}

export type UpdateLegacyMessageInput = Partial<Omit<CreateLegacyMessageInput, 'owner_id' | 'created_at'>>;

export interface LegacyMessageUseCaseDeps {
  legacyMessageRepository: LegacyMessageRepository;
  memoryRepository: MemoryRepository;
  beliefRepository: BeliefRepository;
  lessonRepository: LessonRepository;
  valueProfileRepository: ValueProfileRepository;
  narrativeNodeRepository: NarrativeNodeRepository;
}

const validateCreateLegacyMessage = async (
  deps: LegacyMessageUseCaseDeps,
  input: CreateLegacyMessageInput,
): Promise<LegacyMessage> => {
  const metadata = defaultedMetadata(input);
  ensureRequiredString(input.title, 'title');
  ensureRequiredString(input.message, 'message');
  ensureEnum(input.trigger_type, TRIGGER_TYPES, 'trigger_type');
  ensureEnum(input.delivery_status, DELIVERY_STATUS, 'delivery_status');

  return {
    ...metadata,
    title: input.title,
    message: input.message,
    trigger_type: input.trigger_type,
    trigger_at: input.trigger_at,
    recipient_ids: input.recipient_ids,
    attachment_memory_ids: await ensureRelatedIds(
      input.attachment_memory_ids,
      'attachment_memory_ids',
      deps.memoryRepository.existsByIds,
    ),
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
    delivery_status: input.delivery_status,
  };
};

const validateUpdateLegacyMessage = async (
  deps: LegacyMessageUseCaseDeps,
  input: UpdateLegacyMessageInput,
): Promise<Partial<LegacyMessage>> => {
  const patch: Partial<LegacyMessage> = { updated_at: new Date().toISOString() };

  if (input.visibility !== undefined) patch.visibility = ensureEnum(input.visibility, VISIBILITIES, 'visibility');
  if (input.title !== undefined) patch.title = ensureRequiredString(input.title, 'title');
  if (input.message !== undefined) patch.message = ensureRequiredString(input.message, 'message');
  if (input.trigger_type !== undefined) patch.trigger_type = ensureEnum(input.trigger_type, TRIGGER_TYPES, 'trigger_type');
  if (input.trigger_at !== undefined) patch.trigger_at = input.trigger_at;
  if (input.recipient_ids !== undefined) patch.recipient_ids = input.recipient_ids;
  if (input.delivery_status !== undefined) {
    patch.delivery_status = ensureEnum(input.delivery_status, DELIVERY_STATUS, 'delivery_status');
  }
  if (input.attachment_memory_ids !== undefined) {
    patch.attachment_memory_ids = await ensureRelatedIds(
      input.attachment_memory_ids,
      'attachment_memory_ids',
      deps.memoryRepository.existsByIds,
    );
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

export const createLegacyMessage = async (
  deps: LegacyMessageUseCaseDeps,
  input: CreateLegacyMessageInput,
): Promise<LegacyMessage> => deps.legacyMessageRepository.create(await validateCreateLegacyMessage(deps, input));

export const updateLegacyMessage = async (
  deps: LegacyMessageUseCaseDeps,
  id: string,
  input: UpdateLegacyMessageInput,
): Promise<LegacyMessage | null> => deps.legacyMessageRepository.update(id, await validateUpdateLegacyMessage(deps, input));

export const deleteLegacyMessage = async (deps: LegacyMessageUseCaseDeps, id: string): Promise<boolean> =>
  deps.legacyMessageRepository.delete(id);

export const listLegacyMessages = async (
  deps: Pick<LegacyMessageUseCaseDeps, 'legacyMessageRepository'>,
  ownerId: string,
): Promise<LegacyMessage[]> => {
  ensureRequiredString(ownerId, 'ownerId');
  return deps.legacyMessageRepository.listByOwner(ownerId);
};
