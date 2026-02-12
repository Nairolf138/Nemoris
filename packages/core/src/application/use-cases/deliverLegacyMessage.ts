import type { LegacyMessage, LegacyMessageDeliveryAttempt } from '../../domain/entities.js';
import type { LegacyMessageDeliveryAttemptRepository, LegacyMessageRepository } from '../../repositories/contracts.js';

export interface DeliverLegacyMessageDeps {
  legacyMessageRepository: LegacyMessageRepository;
  legacyMessageDeliveryAttemptRepository: LegacyMessageDeliveryAttemptRepository;
  deliver: (message: LegacyMessage) => Promise<void>;
}

export interface DeliverLegacyMessageResult {
  message: LegacyMessage;
  attempt: LegacyMessageDeliveryAttempt;
}

const buildAttempt = (message: LegacyMessage, status: LegacyMessageDeliveryAttempt['status'], error?: string): LegacyMessageDeliveryAttempt => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  legacy_message_id: message.id,
  owner_id: message.owner_id,
  attempted_at: new Date().toISOString(),
  status,
  error_message: error,
});

export const deliverLegacyMessage = async (deps: DeliverLegacyMessageDeps, id: string): Promise<DeliverLegacyMessageResult> => {
  const message = await deps.legacyMessageRepository.getById(id);
  if (!message) {
    throw new Error('LEGACY_MESSAGE_NOT_FOUND');
  }
  if (message.state !== 'triggered') {
    throw new Error('LEGACY_MESSAGE_INVALID_STATE');
  }

  try {
    await deps.deliver(message);
    const updated = await deps.legacyMessageRepository.update(id, { state: 'sent', updated_at: new Date().toISOString() });
    if (!updated) {
      throw new Error('LEGACY_MESSAGE_NOT_FOUND');
    }
    const attempt = await deps.legacyMessageDeliveryAttemptRepository.create(buildAttempt(updated, 'success'));
    return { message: updated, attempt };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown delivery failure';
    const updated = await deps.legacyMessageRepository.update(id, { state: 'failed', updated_at: new Date().toISOString() });
    if (!updated) {
      throw new Error('LEGACY_MESSAGE_NOT_FOUND');
    }
    const attempt = await deps.legacyMessageDeliveryAttemptRepository.create(buildAttempt(updated, 'failed', errorMessage));
    return { message: updated, attempt };
  }
};
