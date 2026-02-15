import type {
  Beneficiary,
  Belief,
  ConsentRecord,
  ConsentScope,
  ExternalAttachment,
  LegacyMessage,
  LegacyMessageDeliveryAttempt,
  Lesson,
  Memory,
  NarrativeEdge,
  NarrativeNode,
  ValueProfile,
} from '../../domain/entities.js';
import type {
  BeneficiaryRepository,
  BeliefRepository,
  ConsentRepository,
  ExternalAttachmentRepository,
  ListByOwnerQuery,
  LegacyMessageDeliveryAttemptRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  NarrativeEdgeRepository,
  NarrativeNodeRepository,
  PaginatedListResult,
  RepositorySortOrder,
  ValueProfileRepository,
  CapsulePersistence,
} from '../contracts.js';

const asArray = <T>(records: Map<string, T>): T[] => [...records.values()];

const compareValues = (left: unknown, right: unknown, order: RepositorySortOrder): number => {
  if (left === right) {
    return 0;
  }

  const leftValue = left === undefined || left === null ? '' : String(left);
  const rightValue = right === undefined || right === null ? '' : String(right);
  const comparison = leftValue.localeCompare(rightValue);
  return order === 'asc' ? comparison : -comparison;
};

class InMemoryEntityStore<T extends { id: string; owner_id: string }> {
  private readonly records = new Map<string, T>();

  create = async (entity: T): Promise<T> => {
    this.records.set(entity.id, entity);
    return entity;
  };

  update = async (id: string, patch: Partial<T>): Promise<T | null> => {
    const current = this.records.get(id);
    if (!current) {
      return null;
    }
    const updated = { ...current, ...patch } as T;
    this.records.set(id, updated);
    return updated;
  };

  delete = async (id: string): Promise<boolean> => {
    return this.records.delete(id);
  };

  listByOwner = async (ownerId: string): Promise<T[]> => {
    return asArray(this.records).filter((entity) => entity.owner_id === ownerId);
  };

  listByOwnerPaginated = async (ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<T>> => {
    const byOwner = asArray(this.records).filter((entity) => entity.owner_id === ownerId);
    const sorted = [...byOwner].sort((left, right) => {
      const fieldComparison = compareValues(left[query.sortBy as keyof T], right[query.sortBy as keyof T], query.order);
      if (fieldComparison !== 0) {
        return fieldComparison;
      }
      return compareValues(left.id, right.id, query.order);
    });

    return {
      items: sorted.slice(query.offset, query.offset + query.limit),
      total: sorted.length,
      limit: query.limit,
      offset: query.offset,
    };
  };

  getById = async (id: string): Promise<T | null> => {
    return this.records.get(id) ?? null;
  };

  existsByIds = async (ids: string[]): Promise<boolean> => {
    return ids.every((id) => this.records.has(id));
  };
}

export class InMemoryMemoryRepository extends InMemoryEntityStore<Memory> implements MemoryRepository {}

export class InMemoryBeliefRepository extends InMemoryEntityStore<Belief> implements BeliefRepository {}

export class InMemoryLessonRepository extends InMemoryEntityStore<Lesson> implements LessonRepository {}

export class InMemoryValueProfileRepository extends InMemoryEntityStore<ValueProfile> implements ValueProfileRepository {}

export class InMemoryLegacyMessageRepository
  extends InMemoryEntityStore<LegacyMessage>
  implements LegacyMessageRepository {}

export class InMemoryBeneficiaryRepository extends InMemoryEntityStore<Beneficiary> implements BeneficiaryRepository {}


class InMemoryLegacyMessageDeliveryAttemptRepository implements LegacyMessageDeliveryAttemptRepository {
  private readonly records: LegacyMessageDeliveryAttempt[] = [];

  public create = async (attempt: LegacyMessageDeliveryAttempt): Promise<LegacyMessageDeliveryAttempt> => {
    this.records.push(attempt);
    return attempt;
  };

  public listByLegacyMessageId = async (legacyMessageId: string): Promise<LegacyMessageDeliveryAttempt[]> => {
    return this.records
      .filter((attempt) => attempt.legacy_message_id === legacyMessageId)
      .sort((left, right) => left.attempted_at.localeCompare(right.attempted_at));
  };
}


class InMemoryConsentRepository implements ConsentRepository {
  private readonly records: ConsentRecord[] = [];

  public grant = async (input: { owner_id: string; scope: ConsentScope; granted_at: string; legal_basis: string }): Promise<ConsentRecord> => {
    const record: ConsentRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      owner_id: input.owner_id,
      scope: input.scope,
      status: 'granted',
      granted_at: input.granted_at,
      legal_basis: input.legal_basis,
    };
    this.records.push(record);
    return record;
  };

  public revoke = async (input: { owner_id: string; scope: ConsentScope; revoked_at: string; legal_basis: string }): Promise<ConsentRecord> => {
    const latest = await this.getLatestByScope(input.owner_id, input.scope);
    const record: ConsentRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      owner_id: input.owner_id,
      scope: input.scope,
      status: 'revoked',
      granted_at: latest?.granted_at ?? input.revoked_at,
      revoked_at: input.revoked_at,
      legal_basis: input.legal_basis,
    };
    this.records.push(record);
    return record;
  };

  public listByOwner = async (ownerId: string): Promise<ConsentRecord[]> => {
    return this.records
      .filter((record) => record.owner_id === ownerId)
      .sort((left, right) => left.granted_at.localeCompare(right.granted_at));
  };

  public getLatestByScope = async (ownerId: string, scope: ConsentScope): Promise<ConsentRecord | null> => {
    const entries = this.records
      .filter((record) => record.owner_id === ownerId && record.scope === scope)
      .sort((left, right) => {
        const leftTime = left.revoked_at ?? left.granted_at;
        const rightTime = right.revoked_at ?? right.granted_at;
        return leftTime.localeCompare(rightTime);
      });
    return entries.at(-1) ?? null;
  };

  public isGranted = async (ownerId: string, scope: ConsentScope): Promise<boolean> => {
    const latest = await this.getLatestByScope(ownerId, scope);
    return latest?.status === 'granted';
  };
}

export class InMemoryNarrativeNodeRepository extends InMemoryEntityStore<NarrativeNode> implements NarrativeNodeRepository {}

export class InMemoryNarrativeEdgeRepository extends InMemoryEntityStore<NarrativeEdge> implements NarrativeEdgeRepository {}

export class InMemoryExternalAttachmentRepository extends InMemoryEntityStore<ExternalAttachment> implements ExternalAttachmentRepository {}

export const createInMemoryPersistence = (): CapsulePersistence => ({
  memories: new InMemoryMemoryRepository(),
  beliefs: new InMemoryBeliefRepository(),
  lessons: new InMemoryLessonRepository(),
  valueProfiles: new InMemoryValueProfileRepository(),
  legacyMessages: new InMemoryLegacyMessageRepository(),
  beneficiaries: new InMemoryBeneficiaryRepository(),
  legacyMessageDeliveryAttempts: new InMemoryLegacyMessageDeliveryAttemptRepository(),
  narrativeNodes: new InMemoryNarrativeNodeRepository(),
  narrativeEdges: new InMemoryNarrativeEdgeRepository(),
  externalAttachments: new InMemoryExternalAttachmentRepository(),
  consents: new InMemoryConsentRepository(),
});
