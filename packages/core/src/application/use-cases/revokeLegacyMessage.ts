import type { LegacyMessage } from '../../domain/entities.js';
import type { LegacyMessageRepository } from '../../repositories/contracts.js';

export interface RevokeLegacyMessageDeps {
  legacyMessageRepository: LegacyMessageRepository;
}

const revokableStates: LegacyMessage['state'][] = ['draft', 'armed'];

export const revokeLegacyMessage = async (deps: RevokeLegacyMessageDeps, id: string): Promise<LegacyMessage> => {
  const message = await deps.legacyMessageRepository.getById(id);
  if (!message) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  if (!revokableStates.includes(message.state)) {
    throw new Error('LEGACY_MESSAGE_INVALID_STATE');
  }

  const revoked = await deps.legacyMessageRepository.update(id, { state: 'revoked', updated_at: new Date().toISOString() });
  if (!revoked) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  return revoked;
};
