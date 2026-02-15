import type {
  AuthContext,
  Beneficiary,
  Belief,
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
    links: Array<{ label: string; url: string; memoryId?: string }>;
  };
  beneficiariesRules: {
    beneficiaries: Array<{ identity: string; channel: Beneficiary['channel']; contact: string; beneficiaryId?: string }>;
    minimumBeneficiaries: number;
  };
}

export type CollectionName = keyof CapsuleCollections;
