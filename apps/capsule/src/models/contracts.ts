import type {
  AuthContext,
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
  narrativeNodes: NarrativeNode[];
  narrativeEdges: NarrativeEdge[];
}

export type CollectionName = keyof CapsuleCollections;
