import type { LegacyMessage } from '../../domain/entities.js';
import type { LegacyMessageRepository } from '../../repositories/contracts.js';
import type { UseCaseObserver } from './observability.js';

export interface TriggerLegacyMessageDeps {
  legacyMessageRepository: LegacyMessageRepository;
  observer?: UseCaseObserver;
}

export const triggerLegacyMessage = async (deps: TriggerLegacyMessageDeps, id: string): Promise<LegacyMessage> => {
  const message = await deps.legacyMessageRepository.getById(id);
  if (!message) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  if (message.state !== 'armed') {
    throw new Error('LEGACY_MESSAGE_INVALID_STATE');
  }

  const triggered = await deps.legacyMessageRepository.update(id, { state: 'triggered', updated_at: new Date().toISOString() });
  if (!triggered) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  deps.observer?.emitEvent({
    event_name: 'legacy_message.triggered',
    user_id: triggered.owner_id,
    entity_id: triggered.id,
    metadata: { state: triggered.state },
  });
  return triggered;
};
