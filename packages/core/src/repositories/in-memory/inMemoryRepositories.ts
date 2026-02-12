import type { Belief, LegacyMessage, Lesson, Memory, NarrativeNode, ValueProfile } from '../../domain/entities.js';
import type {
  BeliefRepository,
  ListByOwnerQuery,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
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

export class InMemoryNarrativeNodeRepository extends InMemoryEntityStore<NarrativeNode> implements NarrativeNodeRepository {}

export const createInMemoryPersistence = (): CapsulePersistence => ({
  memories: new InMemoryMemoryRepository(),
  beliefs: new InMemoryBeliefRepository(),
  lessons: new InMemoryLessonRepository(),
  valueProfiles: new InMemoryValueProfileRepository(),
  legacyMessages: new InMemoryLegacyMessageRepository(),
  narrativeNodes: new InMemoryNarrativeNodeRepository(),
});
