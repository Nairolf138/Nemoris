import { renderExportPdf, type CapsuleExportPayloadV1, type ExportTransmissionRule } from '@capsule/export';
import { CapsuleApiClient } from './api-client.js';
import { CapsuleApiError } from './errors.js';
import type { CapsuleSummaryData, CapsuleSummaryPdfExport, CapsuleSummaryPrintMode } from './models/contracts.js';
import { appRoutes, resolveRoute, type AppRouteName } from './routes.js';
import { SessionManager, type SessionStorageLike } from './session.js';
import { CapsuleStore } from './state.js';
import { FrontAuthService } from './services/auth-service.js';
import { CapsuleCrudService } from './services/crud-service.js';
import { CapsuleExportService } from './services/export-service.js';
import { OnboardingService } from './services/onboarding-service.js';
import { TimelineService } from './services/timeline-service.js';

const buildTransmissionRules = (legacyMessages: CapsuleExportPayloadV1['legacy_messages']): ExportTransmissionRule[] => {
  const deduped = new Map<string, ExportTransmissionRule>();

  for (const message of legacyMessages) {
    for (const beneficiaryId of message.beneficiary_ids) {
      const key = `${message.id}:${beneficiaryId}`;
      deduped.set(key, {
        legacy_message_id: message.id,
        beneficiary_id: beneficiaryId,
      });
    }
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.legacy_message_id === right.legacy_message_id) {
      return left.beneficiary_id.localeCompare(right.beneficiary_id);
    }
    return left.legacy_message_id.localeCompare(right.legacy_message_id);
  });
};

export interface FrontendArchitecture {
  store: CapsuleStore;
  apiClient: CapsuleApiClient;
  sessionManager: SessionManager;
  auth: FrontAuthService;
  crud: CapsuleCrudService;
  timeline: TimelineService;
  exports: CapsuleExportService;
  onboarding: OnboardingService;
  navigate(route: AppRouteName): string;
  getCapsuleSummary(): CapsuleSummaryData;
  getCapsuleSummaryPrintMode(): CapsuleSummaryPrintMode;
  exportCapsuleSummaryPdf(): CapsuleSummaryPdfExport;
  run<T>(action: () => Promise<T>, options?: { emptyWhen?: (result: T) => boolean; successMessage?: string }): Promise<T>;
}

export const createCapsuleFrontend = (baseUrl: string, storage: SessionStorageLike): FrontendArchitecture => {
  const store = new CapsuleStore();
  const apiClient = new CapsuleApiClient(baseUrl);
  const sessionManager = new SessionManager(storage);
  const auth = new FrontAuthService(apiClient, sessionManager, store);
  const crud = new CapsuleCrudService(apiClient, sessionManager, store);
  const timeline = new TimelineService(apiClient, sessionManager, store);
  const exports = new CapsuleExportService(apiClient, sessionManager, store);
  const onboarding = new OnboardingService(apiClient, sessionManager, store);

  auth.hydrateFromStorage();
  onboarding.hydrateFromStorage();

  return {
    store,
    apiClient,
    sessionManager,
    auth,
    crud,
    timeline,
    exports,
    onboarding,
    navigate(route: AppRouteName): string {
      const state = store.getState();
      return resolveRoute(route, {
        hasSession: Boolean(state.session),
        hasCompletedOnboarding: state.onboardingCompleted,
        onboardingStep: state.onboardingStep,
      });
    },
    getCapsuleSummary(): CapsuleSummaryData {
      const state = store.getState();
      const { legacyMessages, beneficiaries, memories } = state.data;
      const session = state.session;
      const beneficiaryById = new Map(beneficiaries.map((entry) => [entry.id, entry]));

      const messageAttachmentLinks = legacyMessages.flatMap((message) =>
        message.attachment_memory_ids.map((memoryId) => {
          const memory = memories.find((entry) => entry.id === memoryId);
          return {
            label: `Pièce jointe · ${message.title}`,
            sourceMemoryId: memoryId,
            url: memory?.description,
          };
        }),
      );

      const memoryDocumentLinks = memories
        .filter((memory) => memory.memory_type === 'document' || memory.memory_type === 'media')
        .map((memory) => ({
          label: memory.title,
          sourceMemoryId: memory.id,
          url: memory.description,
        }));

      return {
        profile: {
          ownerId: session?.user.id ?? 'unknown-owner',
          ownerEmail: session?.user.email,
          generatedAt: new Date().toISOString(),
        },
        messages: legacyMessages,
        documentLinks: [...memoryDocumentLinks, ...messageAttachmentLinks],
        beneficiaries,
        triggerRules: legacyMessages.map((message) => ({
          messageId: message.id,
          messageTitle: message.title,
          triggerType: message.trigger_type,
          triggerAt: message.trigger_at,
          beneficiaries: message.beneficiary_ids.map((beneficiaryId) => ({
            id: beneficiaryId,
            identity: beneficiaryById.get(beneficiaryId)?.identity ?? beneficiaryId,
          })),
        })),
      };
    },
    getCapsuleSummaryPrintMode(): CapsuleSummaryPrintMode {
      return {
        route: appRoutes.capsuleSummary,
        mode: 'browser-print',
        title: 'Dossier famille · Capsule',
        subtitle: 'Version imprimable synthétique à partager en contexte familial.',
        sections: ['profile', 'messages', 'documents', 'beneficiaries', 'triggerRules'],
      };
    },
    exportCapsuleSummaryPdf(): CapsuleSummaryPdfExport {
      const state = store.getState();
      const session = state.session;
      const ownerId = session?.user.id ?? 'unknown-owner';

      const payload: CapsuleExportPayloadV1 = {
        metadata: {
          schema_version: '1.0.0',
          exported_at: new Date().toISOString(),
          owner_id: ownerId,
          generated_by_user_id: ownerId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        },
        memories: state.data.memories,
        beliefs: state.data.beliefs,
        lessons: state.data.lessons,
        value_profiles: state.data.valueProfiles,
        legacy_messages: state.data.legacyMessages,
        beneficiaries: state.data.beneficiaries,
        transmission_rules: buildTransmissionRules(state.data.legacyMessages),
      };

      return {
        fileName: `dossier-famille-${ownerId}.pdf`,
        mimeType: 'application/pdf',
        bytes: renderExportPdf(payload),
      };
    },
    async run<T>(action: () => Promise<T>, options?: { emptyWhen?: (result: T) => boolean; successMessage?: string }): Promise<T> {
      store.setState({ ui: { status: 'loading', loading: true, error: undefined, message: undefined } });
      try {
        const result = await action();
        store.setState({
          ui: {
            status: options?.emptyWhen?.(result) ? 'empty' : 'ready',
            message: options?.successMessage,
          },
        });
        return result;
      } catch (error) {
        if (error instanceof CapsuleApiError) {
          store.setState({
            ui: {
              status: 'error',
              error: `${error.code}${error.retryAfterMs ? ` (retry in ${error.retryAfterMs}ms)` : ''}`,
            },
          });
        } else {
          store.setState({ ui: { status: 'error', error: 'INTERNAL_ERROR' } });
        }
        throw error;
      } finally {
        store.setState({ ui: { loading: false } });
      }
    },
  };
};
