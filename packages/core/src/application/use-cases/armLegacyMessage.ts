import type { LegacyMessage } from '../../domain/entities.js';
import type { LegacyMessageRepository } from '../../repositories/contracts.js';

export interface ArmLegacyMessageDeps {
  legacyMessageRepository: LegacyMessageRepository;
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
  return armed;
};
