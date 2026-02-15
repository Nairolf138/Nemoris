import type { CapsuleApiClient } from '../api-client.js';
import type { ExternalAttachment, LegacyMessage } from '@capsule/core';
import type { ExternalAttachmentPreview, OnboardingDraft, OnboardingStepKey } from '../models/contracts.js';
import type { SessionManager } from '../session.js';
import type { CapsuleStore } from '../state.js';

const STEP_ORDER: OnboardingStepKey[] = ['identityContact', 'messages', 'documents', 'beneficiariesRules'];

const ALLOWED_ATTACHMENT_TYPES: ExternalAttachment['type'][] = ['document', 'image', 'video', 'audio', 'link'];

const ensureValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const ensureAttachmentType = (value: string): value is ExternalAttachment['type'] => ALLOWED_ATTACHMENT_TYPES.includes(value as ExternalAttachment['type']);

const derivePreview = (url: string, type: ExternalAttachment['type'], label: string): ExternalAttachmentPreview => {
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return undefined;
    }
  })();
  const iconMap: Record<ExternalAttachment['type'], string> = {
    document: '📄',
    image: '🖼️',
    video: '🎬',
    audio: '🎧',
    link: '🔗',
  };
  const typeLabelMap: Record<ExternalAttachment['type'], string> = {
    document: 'Document',
    image: 'Image',
    video: 'Vidéo',
    audio: 'Audio',
    link: 'Lien',
  };

  return {
    icon: iconMap[type],
    typeLabel: typeLabelMap[type],
    title: label.trim() || hostname,
  };
};

export class OnboardingService {
  public constructor(
    private readonly api: CapsuleApiClient,
    private readonly sessionManager: SessionManager,
    private readonly store: CapsuleStore,
  ) {}

  private getAuth(): { token: string; ownerId: string } {
    const session = this.sessionManager.readSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    return {
      token: session.session.token,
      ownerId: session.user.id,
    };
  }

  private persistProgress(): void {
    const { onboardingStep, onboardingDraft, completedSteps } = this.store.getState();
    this.sessionManager.saveOnboardingProgress({ onboardingStep, onboardingDraft, completedSteps });
  }

  public hydrateFromStorage(): void {
    const progress = this.sessionManager.readOnboardingProgress();
    if (!progress) return;
    this.store.setState({
      onboardingStep: progress.onboardingStep,
      onboardingDraft: progress.onboardingDraft,
      completedSteps: progress.completedSteps,
    });
  }

  public resumeDraftStep(): OnboardingStepKey {
    return this.store.getState().onboardingStep;
  }

  public goToStep(step: OnboardingStepKey): OnboardingStepKey {
    const state = this.store.getState();
    const targetIndex = STEP_ORDER.indexOf(step);
    const maxReachable = Math.min(state.completedSteps.length + 1, STEP_ORDER.length - 1);
    if (targetIndex > maxReachable) {
      return STEP_ORDER[maxReachable] ?? 'identityContact';
    }

    this.store.setState({ onboardingStep: step });
    this.persistProgress();
    return step;
  }

  public goPrevious(): OnboardingStepKey {
    const current = this.store.getState().onboardingStep;
    const index = STEP_ORDER.indexOf(current);
    const previous = STEP_ORDER[Math.max(0, index - 1)] ?? 'identityContact';
    this.store.setState({ onboardingStep: previous });
    this.persistProgress();
    return previous;
  }

  public async saveIdentityAndContact(input: OnboardingDraft['identityContact']): Promise<void> {
    if (!input.identity.trim() || !input.contact.trim()) {
      throw new Error('IDENTITY_CONTACT_REQUIRED');
    }

    const { token, ownerId } = this.getAuth();
    const payload = {
      visibility: 'private' as const,
      identity: input.identity.trim(),
      channel: input.channel,
      contact: input.contact.trim(),
      verification_status: 'pending' as const,
      status: 'active' as const,
    };

    const beneficiary = input.beneficiaryId
      ? await this.api.updateCollectionItem('beneficiaries', input.beneficiaryId, token, ownerId, payload)
      : await this.api.createCollectionItem('beneficiaries', token, ownerId, payload);

    const completedSteps = Array.from(new Set([...this.store.getState().completedSteps, 'identityContact'])) as OnboardingStepKey[];

    this.store.setState({
      onboardingDraft: {
        identityContact: {
          ...payload,
          beneficiaryId: beneficiary.id,
        },
      },
      onboardingStep: 'messages',
      completedSteps,
      data: {
        beneficiaries: [...this.store.getState().data.beneficiaries.filter((entry) => entry.id !== beneficiary.id), beneficiary],
      },
    });

    this.persistProgress();
  }

  public async saveMessages(input: OnboardingDraft['messages']): Promise<void> {
    if (!input.title.trim() || !input.message.trim()) {
      throw new Error('MESSAGE_REQUIRED');
    }

    const { token, ownerId } = this.getAuth();
    const payload: Partial<LegacyMessage> = {
      visibility: 'private',
      title: input.title.trim(),
      message: input.message.trim(),
      trigger_type: input.triggerType,
      beneficiary_ids: this.store.getState().onboardingDraft.beneficiariesRules.beneficiaries
        .map((entry) => entry.beneficiaryId)
        .filter((entry): entry is string => Boolean(entry)),
      attachment_memory_ids: [],
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
      state: 'draft',
    };

    const legacyMessage = input.legacyMessageId
      ? await this.api.updateCollectionItem('legacyMessages', input.legacyMessageId, token, ownerId, payload)
      : await this.api.createCollectionItem('legacyMessages', token, ownerId, payload);

    const completedSteps = Array.from(new Set([...this.store.getState().completedSteps, 'messages'])) as OnboardingStepKey[];

    this.store.setState({
      onboardingDraft: {
        messages: {
          ...input,
          title: input.title.trim(),
          message: input.message.trim(),
          legacyMessageId: legacyMessage.id,
        },
      },
      onboardingStep: 'documents',
      completedSteps,
      data: {
        legacyMessages: [...this.store.getState().data.legacyMessages.filter((entry) => entry.id !== legacyMessage.id), legacyMessage],
      },
    });

    this.persistProgress();
  }

  public async saveImportantDocuments(input: OnboardingDraft['documents']): Promise<void> {
    if (input.links.some((entry) => !entry.label.trim() || !entry.url.trim() || !ensureValidUrl(entry.url) || !ensureAttachmentType(entry.type))) {
      throw new Error('DOCUMENTS_INVALID');
    }

    const { token, ownerId } = this.getAuth();

    const savedLinks: OnboardingDraft['documents']['links'] = [];
    const createdAttachments: ExternalAttachment[] = [];

    for (const link of input.links) {
      const payload = {
        visibility: link.visibility,
        label: link.label.trim(),
        url: link.url.trim(),
        type: link.type,
        notes: link.notes?.trim() || undefined,
      };
      const attachment = link.externalAttachmentId
        ? await this.api.updateCollectionItem('externalAttachments', link.externalAttachmentId, token, ownerId, payload)
        : await this.api.createCollectionItem('externalAttachments', token, ownerId, payload);

      savedLinks.push({
        label: payload.label,
        url: payload.url,
        type: payload.type,
        notes: payload.notes,
        visibility: payload.visibility,
        externalAttachmentId: attachment.id,
        preview: derivePreview(payload.url, payload.type, payload.label),
      });
      createdAttachments.push(attachment);
    }

    const completedSteps = Array.from(new Set([...this.store.getState().completedSteps, 'documents'])) as OnboardingStepKey[];

    this.store.setState({
      onboardingDraft: {
        documents: { links: savedLinks },
      },
      onboardingStep: 'beneficiariesRules',
      completedSteps,
      data: {
        externalAttachments: [
          ...this.store.getState().data.externalAttachments.filter((entry) => !savedLinks.some((link) => link.externalAttachmentId === entry.id)),
          ...createdAttachments,
        ],
      },
    });

    this.persistProgress();
  }

  public async saveBeneficiariesAndRules(input: OnboardingDraft['beneficiariesRules']): Promise<void> {
    if (input.beneficiaries.length < input.minimumBeneficiaries) {
      throw new Error('MINIMUM_BENEFICIARIES_NOT_REACHED');
    }
    if (input.beneficiaries.some((entry) => !entry.identity.trim() || !entry.contact.trim())) {
      throw new Error('BENEFICIARY_REQUIRED_FIELDS');
    }

    const { token, ownerId } = this.getAuth();

    const savedBeneficiaries = [] as OnboardingDraft['beneficiariesRules']['beneficiaries'];
    const beneficiaryEntities = [] as Array<{ id: string }>;

    for (const beneficiary of input.beneficiaries) {
      const payload = {
        visibility: 'private' as const,
        identity: beneficiary.identity.trim(),
        channel: beneficiary.channel,
        contact: beneficiary.contact.trim(),
        verification_status: 'pending' as const,
        status: 'active' as const,
      };
      const created = beneficiary.beneficiaryId
        ? await this.api.updateCollectionItem('beneficiaries', beneficiary.beneficiaryId, token, ownerId, payload)
        : await this.api.createCollectionItem('beneficiaries', token, ownerId, payload);

      savedBeneficiaries.push({ ...payload, beneficiaryId: created.id });
      beneficiaryEntities.push(created);
    }

    const legacyMessageId = this.store.getState().onboardingDraft.messages.legacyMessageId;
    if (legacyMessageId) {
      await this.api.updateCollectionItem('legacyMessages', legacyMessageId, token, ownerId, {
        beneficiary_ids: savedBeneficiaries.map((entry) => entry.beneficiaryId as string),
      });
    }

    this.store.setState({
      onboardingDraft: {
        beneficiariesRules: {
          beneficiaries: savedBeneficiaries,
          minimumBeneficiaries: input.minimumBeneficiaries,
        },
      },
      completedSteps: STEP_ORDER,
      onboardingCompleted: true,
      data: {
        beneficiaries: [
          ...this.store.getState().data.beneficiaries.filter((entry) => !savedBeneficiaries.some((item) => item.beneficiaryId === entry.id)),
          ...(beneficiaryEntities as never[]),
        ],
      },
    });

    this.sessionManager.markOnboardingComplete();
    this.sessionManager.clearOnboardingProgress();
  }
}
