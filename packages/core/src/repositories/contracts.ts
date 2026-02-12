import type { Belief, LegacyMessage, Lesson, Memory, NarrativeNode, ValueProfile } from '../domain/entities.js';

export interface MemoryRepository {
  create(memory: Memory): Promise<Memory>;
  update(id: string, patch: Partial<Memory>): Promise<Memory | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Memory[]>;
  getById(id: string): Promise<Memory | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface BeliefRepository {
  create(belief: Belief): Promise<Belief>;
  update(id: string, patch: Partial<Belief>): Promise<Belief | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Belief[]>;
  getById(id: string): Promise<Belief | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface LessonRepository {
  create(lesson: Lesson): Promise<Lesson>;
  update(id: string, patch: Partial<Lesson>): Promise<Lesson | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Lesson[]>;
  getById(id: string): Promise<Lesson | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface ValueProfileRepository {
  create(profile: ValueProfile): Promise<ValueProfile>;
  update(id: string, patch: Partial<ValueProfile>): Promise<ValueProfile | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<ValueProfile[]>;
  getById(id: string): Promise<ValueProfile | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}

export interface LegacyMessageRepository {
  create(message: LegacyMessage): Promise<LegacyMessage>;
  update(id: string, patch: Partial<LegacyMessage>): Promise<LegacyMessage | null>;
  delete(id: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<LegacyMessage[]>;
  getById(id: string): Promise<LegacyMessage | null>;
}

export interface NarrativeNodeRepository {
  getById(id: string): Promise<NarrativeNode | null>;
  existsByIds(ids: string[]): Promise<boolean>;
}


export type PersistenceBackend = 'memory' | 'sqlite';

export interface CapsulePersistence {
  memories: MemoryRepository;
  beliefs: BeliefRepository;
  lessons: LessonRepository;
  valueProfiles: ValueProfileRepository;
  legacyMessages: LegacyMessageRepository;
  narrativeNodes: NarrativeNodeRepository;
}
