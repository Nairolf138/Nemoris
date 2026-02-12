import type { LegacyMessage } from '../../domain/entities.js';
import type {
  BeneficiaryRepository,
  BeliefRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  NarrativeNodeRepository,
  ValueProfileRepository,
} from '../../repositories/contracts.js';
import { VISIBILITIES, ValidationError, defaultedMetadata, ensureEnum, ensureRelatedIds, ensureRequiredString } from '../validation.js';
import type { UseCaseObserver } from './observability.js';

const TRIGGER_TYPES = ['manual', 'date', 'inactivity', 'verified_death'] as const;
const LEGACY_MESSAGE_STATES = ['draft', 'armed', 'triggered', 'sent', 'revoked', 'failed'] as const;

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
  beneficiary_ids: string[];
  attachment_memory_ids: string[];
  related_belief_ids: string[];
  related_lesson_ids: string[];
  related_value_profile_ids: string[];
  related_narrative_node_ids: string[];
  state: LegacyMessage['state'];
}

export type UpdateLegacyMessageInput = Partial<Omit<CreateLegacyMessageInput, 'owner_id' | 'created_at'>>;

export interface LegacyMessageUseCaseDeps {
  legacyMessageRepository: LegacyMessageRepository;
  memoryRepository: MemoryRepository;
  beliefRepository: BeliefRepository;
  lessonRepository: LessonRepository;
  valueProfileRepository: ValueProfileRepository;
  narrativeNodeRepository: NarrativeNodeRepository;
  beneficiaryRepository: BeneficiaryRepository;
  observer?: UseCaseObserver;
}


const ensureTransmissionRules = async (
  deps: LegacyMessageUseCaseDeps,
  ownerId: string,
  beneficiaryIds: string[],
): Promise<string[]> => {
  const normalized = [...new Set(beneficiaryIds)];
  if (normalized.length !== beneficiaryIds.length) {
    throw new ValidationError('Field "beneficiary_ids" contains duplicated references.');
  }

  for (const beneficiaryId of normalized) {
    const beneficiary = await deps.beneficiaryRepository.getById(beneficiaryId);
    if (!beneficiary) {
      throw new ValidationError('Field "beneficiary_ids" contains unknown references.');
    }
    if (beneficiary.owner_id !== ownerId) {
      throw new ValidationError('Field "beneficiary_ids" contains forbidden references.');
    }
    if (beneficiary.status !== 'active') {
      throw new ValidationError('Field "beneficiary_ids" must reference only active beneficiaries.');
    }
    if (beneficiary.verification_status !== 'verified') {
      throw new ValidationError('Field "beneficiary_ids" must reference only verified beneficiaries.');
    }
  }

  return normalized;
};

const validateCreateLegacyMessage = async (deps: LegacyMessageUseCaseDeps, input: CreateLegacyMessageInput): Promise<LegacyMessage> => {
  const metadata = defaultedMetadata(input);
  ensureRequiredString(input.title, 'title');
  ensureRequiredString(input.message, 'message');
  ensureEnum(input.trigger_type, TRIGGER_TYPES, 'trigger_type');
  ensureEnum(input.state, LEGACY_MESSAGE_STATES, 'state');

  return {
    ...metadata,
    title: input.title,
    message: input.message,
    trigger_type: input.trigger_type,
    trigger_at: input.trigger_at,
    beneficiary_ids: await ensureTransmissionRules(deps, metadata.owner_id, input.beneficiary_ids),
    attachment_memory_ids: await ensureRelatedIds(input.attachment_memory_ids, 'attachment_memory_ids', deps.memoryRepository.existsByIds),
    related_belief_ids: await ensureRelatedIds(input.related_belief_ids, 'related_belief_ids', deps.beliefRepository.existsByIds),
    related_lesson_ids: await ensureRelatedIds(input.related_lesson_ids, 'related_lesson_ids', deps.lessonRepository.existsByIds),
    related_value_profile_ids: await ensureRelatedIds(input.related_value_profile_ids, 'related_value_profile_ids', deps.valueProfileRepository.existsByIds),
    related_narrative_node_ids: await ensureRelatedIds(
      input.related_narrative_node_ids,
      'related_narrative_node_ids',
      deps.narrativeNodeRepository.existsByIds,
    ),
    state: input.state,
  };
};

const validateUpdateLegacyMessage = async (
  deps: LegacyMessageUseCaseDeps,
  current: LegacyMessage,
  input: UpdateLegacyMessageInput,
): Promise<Partial<LegacyMessage>> => {
  const patch: Partial<LegacyMessage> = { updated_at: new Date().toISOString() };

  if (input.visibility !== undefined) patch.visibility = ensureEnum(input.visibility, VISIBILITIES, 'visibility');
  if (input.title !== undefined) patch.title = ensureRequiredString(input.title, 'title');
  if (input.message !== undefined) patch.message = ensureRequiredString(input.message, 'message');
  if (input.trigger_type !== undefined) patch.trigger_type = ensureEnum(input.trigger_type, TRIGGER_TYPES, 'trigger_type');
  if (input.trigger_at !== undefined) patch.trigger_at = input.trigger_at;
  if (input.beneficiary_ids !== undefined) patch.beneficiary_ids = await ensureTransmissionRules(deps, current.owner_id, input.beneficiary_ids);
  if (input.state !== undefined) patch.state = ensureEnum(input.state, LEGACY_MESSAGE_STATES, 'state');
  if (input.attachment_memory_ids !== undefined) {
    patch.attachment_memory_ids = await ensureRelatedIds(input.attachment_memory_ids, 'attachment_memory_ids', deps.memoryRepository.existsByIds);
  }
  if (input.related_belief_ids !== undefined) {
    patch.related_belief_ids = await ensureRelatedIds(input.related_belief_ids, 'related_belief_ids', deps.beliefRepository.existsByIds);
  }
  if (input.related_lesson_ids !== undefined) {
    patch.related_lesson_ids = await ensureRelatedIds(input.related_lesson_ids, 'related_lesson_ids', deps.lessonRepository.existsByIds);
  }
  if (input.related_value_profile_ids !== undefined) {
    patch.related_value_profile_ids = await ensureRelatedIds(input.related_value_profile_ids, 'related_value_profile_ids', deps.valueProfileRepository.existsByIds);
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

export const createLegacyMessage = async (deps: LegacyMessageUseCaseDeps, input: CreateLegacyMessageInput): Promise<LegacyMessage> => {
  const created = await deps.legacyMessageRepository.create(await validateCreateLegacyMessage(deps, input));
  deps.observer?.emitEvent({
    event_name: 'legacy_message.created',
    user_id: created.owner_id,
    entity_id: created.id,
    metadata: { state: created.state },
  });
  return created;
};

export const updateLegacyMessage = async (
  deps: LegacyMessageUseCaseDeps,
  id: string,
  input: UpdateLegacyMessageInput,
): Promise<LegacyMessage | null> => {
  const current = await deps.legacyMessageRepository.getById(id);
  if (!current) return null;
  const updated = await deps.legacyMessageRepository.update(id, await validateUpdateLegacyMessage(deps, current, input));
  if (!updated) return null;

  deps.observer?.emitEvent({
    event_name: 'legacy_message.updated',
    user_id: updated.owner_id,
    entity_id: updated.id,
    metadata: { state: updated.state },
  });

  return updated;
};

export const deleteLegacyMessage = async (deps: LegacyMessageUseCaseDeps, id: string): Promise<boolean> => {
  const deleted = await deps.legacyMessageRepository.delete(id);
  if (deleted) {
    deps.observer?.emitEvent({ event_name: 'legacy_message.deleted', user_id: 'system', entity_id: id, metadata: {} });
  }
  return deleted;
};

export const listLegacyMessages = async (
  deps: Pick<LegacyMessageUseCaseDeps, 'legacyMessageRepository'>,
  ownerId: string,
): Promise<LegacyMessage[]> => {
  ensureRequiredString(ownerId, 'ownerId');
  return deps.legacyMessageRepository.listByOwner(ownerId);
};
