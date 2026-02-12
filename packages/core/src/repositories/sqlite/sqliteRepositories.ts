import { execFileSync } from 'node:child_process';
import type { Belief, LegacyMessage, Lesson, Memory, NarrativeEdge, NarrativeNode, ValueProfile } from '../../domain/entities.js';
import type {
  BeliefRepository,
  CapsulePersistence,
  LegacyMessageRepository,
  LessonRepository,
  ListByOwnerQuery,
  MemoryRepository,
  NarrativeEdgeRepository,
  NarrativeNodeRepository,
  PaginatedListResult,
  RepositorySortOrder,
  ValueProfileRepository,
} from '../contracts.js';

type Entity = { id: string; owner_id: string };

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const runSql = (dbPath: string, sql: string): string => {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
};

const normalizeOrder = (order: RepositorySortOrder): 'ASC' | 'DESC' => (order === 'asc' ? 'ASC' : 'DESC');

class SqliteEntityStore<T extends Entity> {
  public constructor(
    private readonly dbPath: string,
    private readonly tableName: string,
  ) {}

  public create = async (entity: T): Promise<T> => {
    runSql(
      this.dbPath,
      `INSERT INTO ${this.tableName} (id, owner_id, payload) VALUES (${quote(entity.id)}, ${quote(entity.owner_id)}, ${quote(JSON.stringify(entity))});`,
    );
    return entity;
  };

  public update = async (id: string, patch: Partial<T>): Promise<T | null> => {
    const current = await this.getById(id);
    if (!current) {
      return null;
    }
    const updated = { ...current, ...patch } as T;
    runSql(
      this.dbPath,
      `UPDATE ${this.tableName} SET owner_id = ${quote(updated.owner_id)}, payload = ${quote(JSON.stringify(updated))} WHERE id = ${quote(id)};`,
    );
    return updated;
  };

  public delete = async (id: string): Promise<boolean> => {
    const before = runSql(this.dbPath, `SELECT count(1) FROM ${this.tableName} WHERE id = ${quote(id)};`).trim();
    runSql(this.dbPath, `DELETE FROM ${this.tableName} WHERE id = ${quote(id)};`);
    return Number(before) > 0;
  };

  public listByOwner = async (ownerId: string): Promise<T[]> => {
    const rows = runSql(this.dbPath, `SELECT payload FROM ${this.tableName} WHERE owner_id = ${quote(ownerId)};`)
      .split('\n')
      .filter(Boolean);
    return rows.map((payload) => JSON.parse(payload) as T);
  };

  public listByOwnerPaginated = async (ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<T>> => {
    const direction = normalizeOrder(query.order);
    const ownerCondition = `json_extract(payload, '$.owner_id') = ${quote(ownerId)}`;
    const escapedPath = query.sortBy.replace(/'/g, "''");
    const sortExpr = `COALESCE(json_extract(payload, '$.${escapedPath}'), '')`;

    const rows = runSql(
      this.dbPath,
      `
      SELECT payload
      FROM ${this.tableName}
      WHERE ${ownerCondition}
      ORDER BY ${sortExpr} ${direction}, id ${direction}
      LIMIT ${query.limit}
      OFFSET ${query.offset};
      `,
    )
      .split('\n')
      .filter(Boolean)
      .map((payload) => JSON.parse(payload) as T);

    const totalRaw = runSql(
      this.dbPath,
      `SELECT count(1) FROM ${this.tableName} WHERE ${ownerCondition};`,
    ).trim();

    return {
      items: rows,
      total: Number(totalRaw),
      limit: query.limit,
      offset: query.offset,
    };
  };

  public getById = async (id: string): Promise<T | null> => {
    const row = runSql(this.dbPath, `SELECT payload FROM ${this.tableName} WHERE id = ${quote(id)} LIMIT 1;`).trim();
    return row ? (JSON.parse(row) as T) : null;
  };

  public existsByIds = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) {
      return true;
    }
    const inList = ids.map(quote).join(', ');
    const count = runSql(this.dbPath, `SELECT count(1) FROM ${this.tableName} WHERE id IN (${inList});`).trim();
    return Number(count) === ids.length;
  };
}

export class SqliteMemoryRepository extends SqliteEntityStore<Memory> implements MemoryRepository {}
export class SqliteBeliefRepository extends SqliteEntityStore<Belief> implements BeliefRepository {}
export class SqliteLessonRepository extends SqliteEntityStore<Lesson> implements LessonRepository {}
export class SqliteValueProfileRepository extends SqliteEntityStore<ValueProfile> implements ValueProfileRepository {}
export class SqliteLegacyMessageRepository extends SqliteEntityStore<LegacyMessage> implements LegacyMessageRepository {}
export class SqliteNarrativeNodeRepository extends SqliteEntityStore<NarrativeNode> implements NarrativeNodeRepository {}
export class SqliteNarrativeEdgeRepository extends SqliteEntityStore<NarrativeEdge> implements NarrativeEdgeRepository {}

const setupSchema = (dbPath: string): void => {
  runSql(
    dbPath,
    `
    CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS beliefs (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS value_profiles (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS legacy_messages (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS narrative_nodes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS narrative_edges (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_memories_owner ON memories(owner_id);
    CREATE INDEX IF NOT EXISTS idx_beliefs_owner ON beliefs(owner_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_owner ON lessons(owner_id);
    CREATE INDEX IF NOT EXISTS idx_value_profiles_owner ON value_profiles(owner_id);
    CREATE INDEX IF NOT EXISTS idx_legacy_messages_owner ON legacy_messages(owner_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_nodes_owner ON narrative_nodes(owner_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_edges_owner ON narrative_edges(owner_id);
  `,
  );
};

export const createSqlitePersistence = (path: string): CapsulePersistence => {
  setupSchema(path);
  return {
    memories: new SqliteMemoryRepository(path, 'memories'),
    beliefs: new SqliteBeliefRepository(path, 'beliefs'),
    lessons: new SqliteLessonRepository(path, 'lessons'),
    valueProfiles: new SqliteValueProfileRepository(path, 'value_profiles'),
    legacyMessages: new SqliteLegacyMessageRepository(path, 'legacy_messages'),
    narrativeNodes: new SqliteNarrativeNodeRepository(path, 'narrative_nodes'),
    narrativeEdges: new SqliteNarrativeEdgeRepository(path, 'narrative_edges'),
  };
};
