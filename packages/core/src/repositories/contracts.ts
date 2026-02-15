import type {
  Beneficiary,
  Belief,
  ConsentRecord,
  ExternalAttachment,
  ConsentScope,
  LegacyMessage,
  LegacyMessageDeliveryAttempt,
  Lesson,
  Memory,
  NarrativeEdge,
  NarrativeNode,
  ValueProfile,
} from '../domain/entities.js';

export type RepositorySortOrder = 'asc' | 'desc';

export interface ListByOwnerQuery {
  limit: number;
  offset: number;
  sortBy: string;
  order: RepositorySortOrder;
}

export interface PaginatedListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemoryRepository {
  create(memory: Memory): Promise<Memory>;
  update(id: string, patch: Partial<Memory>): Promise<Memory | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Memory[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<Memory>>;
  getById(id: string): Promise<Memory | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface BeliefRepository {
  create(belief: Belief): Promise<Belief>;
  update(id: string, patch: Partial<Belief>): Promise<Belief | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Belief[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<Belief>>;
  getById(id: string): Promise<Belief | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface LessonRepository {
  create(lesson: Lesson): Promise<Lesson>;
  update(id: string, patch: Partial<Lesson>): Promise<Lesson | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Lesson[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<Lesson>>;
  getById(id: string): Promise<Lesson | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface ValueProfileRepository {
  create(profile: ValueProfile): Promise<ValueProfile>;
  update(id: string, patch: Partial<ValueProfile>): Promise<ValueProfile | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<ValueProfile[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<ValueProfile>>;
  getById(id: string): Promise<ValueProfile | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface LegacyMessageRepository {
  create(message: LegacyMessage): Promise<LegacyMessage>;
  update(id: string, patch: Partial<LegacyMessage>): Promise<LegacyMessage | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<LegacyMessage[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<LegacyMessage>>;
  getById(id: string): Promise<LegacyMessage | null>;
}

export interface LegacyMessageDeliveryAttemptRepository {
  create(attempt: LegacyMessageDeliveryAttempt): Promise<LegacyMessageDeliveryAttempt>;
  listByLegacyMessageId(legacyMessageId: string): Promise<LegacyMessageDeliveryAttempt[]>;
}

export interface BeneficiaryRepository {
  create(beneficiary: Beneficiary): Promise<Beneficiary>;
  update(id: string, patch: Partial<Beneficiary>): Promise<Beneficiary | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Beneficiary[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<Beneficiary>>;
  getById(id: string): Promise<Beneficiary | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface NarrativeNodeRepository {
  create(node: NarrativeNode): Promise<NarrativeNode>;
  update(id: string, patch: Partial<NarrativeNode>): Promise<NarrativeNode | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<NarrativeNode[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<NarrativeNode>>;
  getById(id: string): Promise<NarrativeNode | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface NarrativeEdgeRepository {
  create(edge: NarrativeEdge): Promise<NarrativeEdge>;
  update(id: string, patch: Partial<NarrativeEdge>): Promise<NarrativeEdge | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<NarrativeEdge[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<NarrativeEdge>>;
  getById(id: string): Promise<NarrativeEdge | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface ExternalAttachmentRepository {
  create(attachment: ExternalAttachment): Promise<ExternalAttachment>;
  update(id: string, patch: Partial<ExternalAttachment>): Promise<ExternalAttachment | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<ExternalAttachment[]>;
  listByOwnerPaginated(ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<ExternalAttachment>>;
  getById(id: string): Promise<ExternalAttachment | null>;
}

export interface ConsentRepository {
  grant(input: { owner_id: string; scope: ConsentScope; granted_at: string; legal_basis: string }): Promise<ConsentRecord>;
  revoke(input: { owner_id: string; scope: ConsentScope; revoked_at: string; legal_basis: string }): Promise<ConsentRecord>;
  listByOwner(ownerId: string): Promise<ConsentRecord[]>;
  getLatestByScope(ownerId: string, scope: ConsentScope): Promise<ConsentRecord | null>;
  isGranted(ownerId: string, scope: ConsentScope): Promise<boolean>;
}

export type PersistenceBackend = 'memory' | 'sqlite';

export interface CapsulePersistence {
  memories: MemoryRepository;
  beliefs: BeliefRepository;
  lessons: LessonRepository;
  valueProfiles: ValueProfileRepository;
  legacyMessages: LegacyMessageRepository;
  beneficiaries: BeneficiaryRepository;
  legacyMessageDeliveryAttempts: LegacyMessageDeliveryAttemptRepository;
  narrativeNodes: NarrativeNodeRepository;
  narrativeEdges: NarrativeEdgeRepository;
  externalAttachments: ExternalAttachmentRepository;
  consents: ConsentRepository;
}
