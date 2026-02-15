import type {
  AuthContext,
  Beneficiary,
  Belief,
  ExternalAttachment,
  Lesson,
  LegacyMessage,
  Memory,
  NarrativeEdge,
  NarrativeNode,
  ValueProfile,
} from '@capsule/core';

export type ExportFormat = 'json' | 'pdf';

export interface ExportJob {
  id: string;
  owner_id: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  download_url?: string;
}

export interface ApiErrorPayload {
  error: string;
  message?: string;
  retry_after_ms?: number;
  details?: Record<string, unknown>;
}

export interface AuthSessionResponse extends AuthContext {}


export interface RecoveryCompletionResponse extends AuthSessionResponse {
  recovery: {
    proofs_count: number;
    sensitive_actions_blocked_until?: string;
  };
}

export interface RefreshResponse {
  session: AuthContext['session'];
}

export interface CapsuleCollections {
  memories: Memory[];
  beliefs: Belief[];
  lessons: Lesson[];
  valueProfiles: ValueProfile[];
  legacyMessages: LegacyMessage[];
  beneficiaries: Beneficiary[];
  narrativeNodes: NarrativeNode[];
  narrativeEdges: NarrativeEdge[];
  externalAttachments: ExternalAttachment[];
}

export type OnboardingStepKey = 'identityContact' | 'messages' | 'documents' | 'beneficiariesRules';

export interface OnboardingDraft {
  identityContact: {
    identity: string;
    channel: Beneficiary['channel'];
    contact: string;
    beneficiaryId?: string;
  };
  messages: {
    title: string;
    message: string;
    triggerType: LegacyMessage['trigger_type'];
    legacyMessageId?: string;
  };
  documents: {
    links: Array<{
      label: string;
      url: string;
      type: ExternalAttachment['type'];
      notes?: string;
      visibility: ExternalAttachment['visibility'];
      externalAttachmentId?: string;
      preview?: ExternalAttachmentPreview;
    }>;
  };
  beneficiariesRules: {
    beneficiaries: Array<{ identity: string; channel: Beneficiary['channel']; contact: string; beneficiaryId?: string }>;
    minimumBeneficiaries: number;
  };
}

export type CollectionName = keyof CapsuleCollections;

export interface ExternalAttachmentPreview {
  icon: string;
  typeLabel: string;
  title?: string;
}

export interface CapsuleSummaryDocumentLink {
  label: string;
  url?: string;
  sourceMemoryId?: string;
}

export interface CapsuleSummaryTriggerRule {
  messageId: string;
  messageTitle: string;
  triggerType: LegacyMessage['trigger_type'];
  triggerAt?: string;
  beneficiaries: Array<{ id: string; identity: string }>;
}

export interface CapsuleSummaryData {
  profile: {
    ownerId: string;
    ownerEmail?: string;
    generatedAt: string;
  };
  messages: LegacyMessage[];
  documentLinks: CapsuleSummaryDocumentLink[];
  beneficiaries: Beneficiary[];
  triggerRules: CapsuleSummaryTriggerRule[];
}

export interface CapsuleSummaryPrintMode {
  route: string;
  mode: 'browser-print';
  title: string;
  subtitle: string;
  sections: Array<'profile' | 'messages' | 'documents' | 'beneficiaries' | 'triggerRules'>;
}

export interface CapsuleSummaryPdfExport {
  fileName: string;
  mimeType: 'application/pdf';
  bytes: Uint8Array;
}
