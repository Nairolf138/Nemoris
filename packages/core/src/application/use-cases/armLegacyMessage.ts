import type { LegacyMessage } from '../../domain/entities.js';
import type { LegacyMessageRepository } from '../../repositories/contracts.js';
import type { UseCaseObserver } from './observability.js';

export interface ArmLegacyMessageDeps {
  legacyMessageRepository: LegacyMessageRepository;
  observer?: UseCaseObserver;
}

export const armLegacyMessage = async (deps: ArmLegacyMessageDeps, id: string): Promise<LegacyMessage> => {
  const message = await deps.legacyMessageRepository.getById(id);
  if (!message) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  if (message.state !== 'draft') {
    throw new Error('LEGACY_MESSAGE_INVALID_STATE');
  }

  const armed = await deps.legacyMessageRepository.update(id, { state: 'armed', updated_at: new Date().toISOString() });
  if (!armed) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  deps.observer?.emitEvent({
    event_name: 'legacy_message.armed',
    user_id: armed.owner_id,
    entity_id: armed.id,
    metadata: { state: armed.state },
  });
  return armed;
};
