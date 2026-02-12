import type { LegacyMessage } from '../../domain/entities.js';
import type { LegacyMessageRepository } from '../../repositories/contracts.js';

export interface TriggerLegacyMessageDeps {
  legacyMessageRepository: LegacyMessageRepository;
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
  return triggered;
};
