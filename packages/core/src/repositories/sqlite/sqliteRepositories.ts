import { execFileSync } from 'node:child_process';
import type {
  Beneficiary,
  Belief,
  ConsentRecord,
  ConsentScope,
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
  CapsulePersistence,
  ConsentRepository,
  LegacyMessageDeliveryAttemptRepository,
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
export class SqliteBeneficiaryRepository extends SqliteEntityStore<Beneficiary> implements BeneficiaryRepository {}
export class SqliteLegacyMessageDeliveryAttemptRepository implements LegacyMessageDeliveryAttemptRepository {
  public constructor(private readonly dbPath: string) {}

  public create = async (attempt: LegacyMessageDeliveryAttempt): Promise<LegacyMessageDeliveryAttempt> => {
    runSql(
      this.dbPath,
      `INSERT INTO legacy_message_delivery_attempts (id, legacy_message_id, owner_id, attempted_at, payload) VALUES (${quote(attempt.id)}, ${quote(attempt.legacy_message_id)}, ${quote(attempt.owner_id)}, ${quote(attempt.attempted_at)}, ${quote(JSON.stringify(attempt))});`,
    );
    return attempt;
  };

  public listByLegacyMessageId = async (legacyMessageId: string): Promise<LegacyMessageDeliveryAttempt[]> => {
    const rows = runSql(
      this.dbPath,
      `SELECT payload FROM legacy_message_delivery_attempts WHERE legacy_message_id = ${quote(legacyMessageId)} ORDER BY attempted_at ASC, id ASC;`,
    )
      .split('\n')
      .filter(Boolean);
    return rows.map((payload) => JSON.parse(payload) as LegacyMessageDeliveryAttempt);
  };
}


export class SqliteConsentRepository implements ConsentRepository {
  public constructor(private readonly dbPath: string) {}

  public grant = async (input: { owner_id: string; scope: ConsentScope; granted_at: string; legal_basis: string }): Promise<ConsentRecord> => {
    const record: ConsentRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      owner_id: input.owner_id,
      scope: input.scope,
      status: 'granted',
      granted_at: input.granted_at,
      legal_basis: input.legal_basis,
    };
    runSql(
      this.dbPath,
      `INSERT INTO consent_records (id, owner_id, scope, status, granted_at, revoked_at, legal_basis, payload) VALUES (${quote(record.id)}, ${quote(record.owner_id)}, ${quote(record.scope)}, ${quote(record.status)}, ${quote(record.granted_at)}, NULL, ${quote(record.legal_basis)}, ${quote(JSON.stringify(record))});`,
    );
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
    runSql(
      this.dbPath,
      `INSERT INTO consent_records (id, owner_id, scope, status, granted_at, revoked_at, legal_basis, payload) VALUES (${quote(record.id)}, ${quote(record.owner_id)}, ${quote(record.scope)}, ${quote(record.status)}, ${quote(record.granted_at)}, ${quote(record.revoked_at ?? '')}, ${quote(record.legal_basis)}, ${quote(JSON.stringify(record))});`,
    );
    return record;
  };

  public listByOwner = async (ownerId: string): Promise<ConsentRecord[]> => {
    const rows = runSql(
      this.dbPath,
      `SELECT payload FROM consent_records WHERE owner_id = ${quote(ownerId)} ORDER BY COALESCE(revoked_at, granted_at) ASC, id ASC;`,
    )
      .split('\n')
      .filter(Boolean);
    return rows.map((payload) => JSON.parse(payload) as ConsentRecord);
  };

  public getLatestByScope = async (ownerId: string, scope: ConsentScope): Promise<ConsentRecord | null> => {
    const row = runSql(
      this.dbPath,
      `SELECT payload FROM consent_records WHERE owner_id = ${quote(ownerId)} AND scope = ${quote(scope)} ORDER BY COALESCE(revoked_at, granted_at) DESC, id DESC LIMIT 1;`,
    ).trim();
    return row ? (JSON.parse(row) as ConsentRecord) : null;
  };

  public isGranted = async (ownerId: string, scope: ConsentScope): Promise<boolean> => {
    const latest = await this.getLatestByScope(ownerId, scope);
    return latest?.status === 'granted';
  };
}

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
    CREATE TABLE IF NOT EXISTS beneficiaries (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS legacy_message_delivery_attempts (id TEXT PRIMARY KEY, legacy_message_id TEXT NOT NULL, owner_id TEXT NOT NULL, attempted_at TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS narrative_nodes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS narrative_edges (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consent_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, scope TEXT NOT NULL, status TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT, legal_basis TEXT NOT NULL, payload TEXT NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_memories_owner ON memories(owner_id);
    CREATE INDEX IF NOT EXISTS idx_beliefs_owner ON beliefs(owner_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_owner ON lessons(owner_id);
    CREATE INDEX IF NOT EXISTS idx_value_profiles_owner ON value_profiles(owner_id);
    CREATE INDEX IF NOT EXISTS idx_legacy_messages_owner ON legacy_messages(owner_id);
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_owner ON beneficiaries(owner_id);
    CREATE INDEX IF NOT EXISTS idx_legacy_message_delivery_attempts_message ON legacy_message_delivery_attempts(legacy_message_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_nodes_owner ON narrative_nodes(owner_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_edges_owner ON narrative_edges(owner_id);
    CREATE INDEX IF NOT EXISTS idx_consent_records_owner_scope ON consent_records(owner_id, scope);
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
    beneficiaries: new SqliteBeneficiaryRepository(path, 'beneficiaries'),
    legacyMessageDeliveryAttempts: new SqliteLegacyMessageDeliveryAttemptRepository(path),
    narrativeNodes: new SqliteNarrativeNodeRepository(path, 'narrative_nodes'),
    narrativeEdges: new SqliteNarrativeEdgeRepository(path, 'narrative_edges'),
    consents: new SqliteConsentRepository(path),
  };
};
