import { execFileSync } from 'node:child_process';
import type {
  Beneficiary,
  Belief,
  ConsentRecord,
  ConsentScope,
  ExternalAttachment,
  LegacyMessage,
  LegacyMessageDeliveryAttempt,
  TriggerRequest,
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
  ExternalAttachmentRepository,
  LegacyMessageDeliveryAttemptRepository,
  TriggerRequestRepository,
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
type RuntimeEnv = Record<string, string | undefined>;
const runtimeEnv: RuntimeEnv = ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const toHex = (bytes: Uint8Array): string => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  return out;
};

const parseKeyRing = (): Array<{ kid: string; secret: string }> => {
  const raw = runtimeEnv.CAPSULE_DATA_ENCRYPTION_KEYS?.trim();
  if (!raw) {
    return [{ kid: 'd1', secret: runtimeEnv.CAPSULE_SESSION_TOKEN_SECRET ?? 'dev-secret' }];
  }
  return raw.split(',').map((entry, index) => {
    const [kid, secret] = entry.trim().split(':', 2);
    if (!kid || !secret) {
      throw new Error('INVALID_ENV_CAPSULE_DATA_ENCRYPTION_KEYS');
    }
    return { kid: kid || `d${index + 1}`, secret };
  });
};

class PayloadCipher {
  private readonly strategy = (runtimeEnv.CAPSULE_DATA_ENCRYPTION_STRATEGY ?? 'plaintext').toLowerCase();
  private readonly keys = parseKeyRing();

  private deriveAesKey = async (secret: string): Promise<CryptoKey> => {
    const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
    return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
  };

  public encode = async (payload: string): Promise<string> => {
    if (this.strategy === 'plaintext') {
      return payload;
    }
    const active = this.keys[0] as { kid: string; secret: string };
    const key = await this.deriveAesKey(active.secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, textEncoder.encode(payload).buffer as ArrayBuffer));
    return `enc1.${active.kid}.${toHex(iv)}.${toHex(encrypted)}`;
  };

  public decode = async (payload: string): Promise<{ plain: string; needsMigration: boolean }> => {
    if (!payload.startsWith('enc1.')) {
      return { plain: payload, needsMigration: this.strategy !== 'plaintext' };
    }
    const [, kid, iv, encrypted] = payload.split('.');
    if (!kid || !iv || !encrypted) {
      throw new Error('INVALID_ENCRYPTED_PAYLOAD');
    }
    const keyEntry = this.keys.find((entry) => entry.kid === kid);
    if (!keyEntry) {
      throw new Error('UNKNOWN_ENCRYPTION_KEY_ID');
    }
    const key = await this.deriveAesKey(keyEntry.secret);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(iv).buffer as ArrayBuffer }, key, fromHex(encrypted).buffer as ArrayBuffer);
    return { plain: textDecoder.decode(plainBuffer), needsMigration: kid !== this.keys[0]?.kid };
  };
}

const runSql = (dbPath: string, sql: string): string => execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
const normalizeOrder = (order: RepositorySortOrder): 'ASC' | 'DESC' => (order === 'asc' ? 'ASC' : 'DESC');

const valueAtPath = (payload: Record<string, unknown>, path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : ''), payload);
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
};

class SqliteEntityStore<T extends Entity> {
  private readonly cipher = new PayloadCipher();

  public constructor(private readonly dbPath: string, private readonly tableName: string) {}

  private decodeRow = async (id: string, payload: string): Promise<T> => {
    const decoded = await this.cipher.decode(payload);
    if (decoded.needsMigration) {
      const reEncoded = await this.cipher.encode(decoded.plain);
      runSql(this.dbPath, `UPDATE ${this.tableName} SET payload = ${quote(reEncoded)} WHERE id = ${quote(id)};`);
    }
    return JSON.parse(decoded.plain) as T;
  };

  public create = async (entity: T): Promise<T> => {
    runSql(this.dbPath, `INSERT INTO ${this.tableName} (id, owner_id, payload) VALUES (${quote(entity.id)}, ${quote(entity.owner_id)}, ${quote(await this.cipher.encode(JSON.stringify(entity)))});`);
    return entity;
  };

  public update = async (id: string, patch: Partial<T>): Promise<T | null> => {
    const current = await this.getById(id);
    if (!current) return null;
    const updated = { ...current, ...patch } as T;
    runSql(this.dbPath, `UPDATE ${this.tableName} SET owner_id = ${quote(updated.owner_id)}, payload = ${quote(await this.cipher.encode(JSON.stringify(updated)))} WHERE id = ${quote(id)};`);
    return updated;
  };

  public delete = async (id: string): Promise<boolean> => {
    const before = runSql(this.dbPath, `SELECT count(1) FROM ${this.tableName} WHERE id = ${quote(id)};`).trim();
    runSql(this.dbPath, `DELETE FROM ${this.tableName} WHERE id = ${quote(id)};`);
    return Number(before) > 0;
  };

  public listByOwner = async (ownerId: string): Promise<T[]> => {
    const rows = runSql(this.dbPath, `SELECT id || '|' || payload FROM ${this.tableName} WHERE owner_id = ${quote(ownerId)};`).split('\n').filter(Boolean);
    return Promise.all(rows.map(async (row) => {
      const splitAt = row.indexOf("|");
      return this.decodeRow(row.slice(0, splitAt), row.slice(splitAt + 1));
    }));
  };

  public listByOwnerPaginated = async (ownerId: string, query: ListByOwnerQuery): Promise<PaginatedListResult<T>> => {
    const direction = normalizeOrder(query.order);
    const all = await this.listByOwner(ownerId);
    const sorted = [...all].sort((a, b) => {
      const left = valueAtPath(a as unknown as Record<string, unknown>, query.sortBy);
      const right = valueAtPath(b as unknown as Record<string, unknown>, query.sortBy);
      const cmp = left.localeCompare(right);
      if (cmp === 0) {
        return direction === 'ASC' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
      }
      return direction === 'ASC' ? cmp : -cmp;
    });
    return { items: sorted.slice(query.offset, query.offset + query.limit), total: all.length, limit: query.limit, offset: query.offset };
  };

  public getById = async (id: string): Promise<T | null> => {
    const row = runSql(this.dbPath, `SELECT payload FROM ${this.tableName} WHERE id = ${quote(id)} LIMIT 1;`).trim();
    return row ? this.decodeRow(id, row) : null;
  };

  public existsByIds = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
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
  private readonly cipher = new PayloadCipher();
  public constructor(private readonly dbPath: string) {}
  public create = async (attempt: LegacyMessageDeliveryAttempt): Promise<LegacyMessageDeliveryAttempt> => {
    runSql(this.dbPath, `INSERT INTO legacy_message_delivery_attempts (id, legacy_message_id, owner_id, attempted_at, payload) VALUES (${quote(attempt.id)}, ${quote(attempt.legacy_message_id)}, ${quote(attempt.owner_id)}, ${quote(attempt.attempted_at)}, ${quote(await this.cipher.encode(JSON.stringify(attempt)))});`);
    return attempt;
  };
  public listByLegacyMessageId = async (legacyMessageId: string): Promise<LegacyMessageDeliveryAttempt[]> => {
    const rows = runSql(this.dbPath, `SELECT id || '|' || payload FROM legacy_message_delivery_attempts WHERE legacy_message_id = ${quote(legacyMessageId)} ORDER BY attempted_at ASC, id ASC;`).split('\n').filter(Boolean);
    return Promise.all(rows.map(async (row) => {
      const splitAt = row.indexOf("|");
      const decoded = await this.cipher.decode(row.slice(splitAt + 1));
      return JSON.parse(decoded.plain) as LegacyMessageDeliveryAttempt;
    }));
  };
}


export class SqliteTriggerRequestRepository implements TriggerRequestRepository {
  private readonly cipher = new PayloadCipher();
  public constructor(private readonly dbPath: string) {}

  private decode = async (payload: string): Promise<TriggerRequest> => {
    const decoded = await this.cipher.decode(payload);
    return JSON.parse(decoded.plain) as TriggerRequest;
  };

  public create = async (request: TriggerRequest): Promise<TriggerRequest> => {
    runSql(this.dbPath, `INSERT INTO trigger_requests (id, owner_id, legacy_message_id, requested_at, payload) VALUES (${quote(request.id)}, ${quote(request.owner_id)}, ${quote(request.legacy_message_id)}, ${quote(request.requested_at)}, ${quote(await this.cipher.encode(JSON.stringify(request)))});`);
    return request;
  };

  public update = async (id: string, patch: Partial<TriggerRequest>): Promise<TriggerRequest | null> => {
    const current = await this.getById(id);
    if (!current) {
      return null;
    }
    const updated = { ...current, ...patch } as TriggerRequest;
    runSql(this.dbPath, `UPDATE trigger_requests SET owner_id = ${quote(updated.owner_id)}, legacy_message_id = ${quote(updated.legacy_message_id)}, requested_at = ${quote(updated.requested_at)}, payload = ${quote(await this.cipher.encode(JSON.stringify(updated)))} WHERE id = ${quote(id)};`);
    return updated;
  };

  public getById = async (id: string): Promise<TriggerRequest | null> => {
    const row = runSql(this.dbPath, `SELECT payload FROM trigger_requests WHERE id = ${quote(id)} LIMIT 1;`).trim();
    if (!row) {
      return null;
    }
    return this.decode(row);
  };

  public listByOwner = async (ownerId: string): Promise<TriggerRequest[]> => {
    const rows = runSql(this.dbPath, `SELECT payload FROM trigger_requests WHERE owner_id = ${quote(ownerId)} ORDER BY requested_at ASC, id ASC;`).split('\n').filter(Boolean);
    return Promise.all(rows.map((payload) => this.decode(payload)));
  };

  public listByLegacyMessageId = async (legacyMessageId: string): Promise<TriggerRequest[]> => {
    const rows = runSql(this.dbPath, `SELECT payload FROM trigger_requests WHERE legacy_message_id = ${quote(legacyMessageId)} ORDER BY requested_at ASC, id ASC;`).split('\n').filter(Boolean);
    return Promise.all(rows.map((payload) => this.decode(payload)));
  };

  public getLatestByLegacyMessageId = async (legacyMessageId: string): Promise<TriggerRequest | null> => {
    const row = runSql(this.dbPath, `SELECT payload FROM trigger_requests WHERE legacy_message_id = ${quote(legacyMessageId)} ORDER BY requested_at DESC, id DESC LIMIT 1;`).trim();
    if (!row) {
      return null;
    }
    return this.decode(row);
  };
}

export class SqliteConsentRepository implements ConsentRepository {
  private readonly cipher = new PayloadCipher();
  public constructor(private readonly dbPath: string) {}
  public grant = async (input: { owner_id: string; scope: ConsentScope; granted_at: string; legal_basis: string }): Promise<ConsentRecord> => {
    const record: ConsentRecord = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, owner_id: input.owner_id, scope: input.scope, status: 'granted', granted_at: input.granted_at, legal_basis: input.legal_basis };
    runSql(this.dbPath, `INSERT INTO consent_records (id, owner_id, scope, status, granted_at, revoked_at, legal_basis, payload) VALUES (${quote(record.id)}, ${quote(record.owner_id)}, ${quote(record.scope)}, ${quote(record.status)}, ${quote(record.granted_at)}, NULL, ${quote(record.legal_basis)}, ${quote(await this.cipher.encode(JSON.stringify(record)))});`);
    return record;
  };
  public revoke = async (input: { owner_id: string; scope: ConsentScope; revoked_at: string; legal_basis: string }): Promise<ConsentRecord> => {
    const latest = await this.getLatestByScope(input.owner_id, input.scope);
    const record: ConsentRecord = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, owner_id: input.owner_id, scope: input.scope, status: 'revoked', granted_at: latest?.granted_at ?? input.revoked_at, revoked_at: input.revoked_at, legal_basis: input.legal_basis };
    runSql(this.dbPath, `INSERT INTO consent_records (id, owner_id, scope, status, granted_at, revoked_at, legal_basis, payload) VALUES (${quote(record.id)}, ${quote(record.owner_id)}, ${quote(record.scope)}, ${quote(record.status)}, ${quote(record.granted_at)}, ${quote(record.revoked_at ?? '')}, ${quote(record.legal_basis)}, ${quote(await this.cipher.encode(JSON.stringify(record)))});`);
    return record;
  };
  public listByOwner = async (ownerId: string): Promise<ConsentRecord[]> => {
    const rows = runSql(this.dbPath, `SELECT payload FROM consent_records WHERE owner_id = ${quote(ownerId)} ORDER BY COALESCE(revoked_at, granted_at) ASC, id ASC;`).split('\n').filter(Boolean);
    return Promise.all(rows.map(async (payload) => {
      const decoded = await this.cipher.decode(payload);
      return JSON.parse(decoded.plain) as ConsentRecord;
    }));
  };
  public getLatestByScope = async (ownerId: string, scope: ConsentScope): Promise<ConsentRecord | null> => {
    const row = runSql(this.dbPath, `SELECT payload FROM consent_records WHERE owner_id = ${quote(ownerId)} AND scope = ${quote(scope)} ORDER BY COALESCE(revoked_at, granted_at) DESC, id DESC LIMIT 1;`).trim();
    if (!row) {
      return null;
    }
    const decoded = await this.cipher.decode(row);
    return JSON.parse(decoded.plain) as ConsentRecord;
  };
  public isGranted = async (ownerId: string, scope: ConsentScope): Promise<boolean> => (await this.getLatestByScope(ownerId, scope))?.status === 'granted';
}

export class SqliteNarrativeNodeRepository extends SqliteEntityStore<NarrativeNode> implements NarrativeNodeRepository {}
export class SqliteNarrativeEdgeRepository extends SqliteEntityStore<NarrativeEdge> implements NarrativeEdgeRepository {}
export class SqliteExternalAttachmentRepository extends SqliteEntityStore<ExternalAttachment> implements ExternalAttachmentRepository {}

const setupSchema = (dbPath: string): void => {
  runSql(dbPath, `
    CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS beliefs (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS value_profiles (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS legacy_messages (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS beneficiaries (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS legacy_message_delivery_attempts (id TEXT PRIMARY KEY, legacy_message_id TEXT NOT NULL, owner_id TEXT NOT NULL, attempted_at TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS trigger_requests (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, legacy_message_id TEXT NOT NULL, requested_at TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS narrative_nodes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS narrative_edges (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS external_attachments (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consent_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, scope TEXT NOT NULL, status TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT, legal_basis TEXT NOT NULL, payload TEXT NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_memories_owner ON memories(owner_id);
    CREATE INDEX IF NOT EXISTS idx_beliefs_owner ON beliefs(owner_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_owner ON lessons(owner_id);
    CREATE INDEX IF NOT EXISTS idx_value_profiles_owner ON value_profiles(owner_id);
    CREATE INDEX IF NOT EXISTS idx_legacy_messages_owner ON legacy_messages(owner_id);
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_owner ON beneficiaries(owner_id);
    CREATE INDEX IF NOT EXISTS idx_legacy_message_delivery_attempts_message ON legacy_message_delivery_attempts(legacy_message_id);
    CREATE INDEX IF NOT EXISTS idx_trigger_requests_owner ON trigger_requests(owner_id);
    CREATE INDEX IF NOT EXISTS idx_trigger_requests_message ON trigger_requests(legacy_message_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_nodes_owner ON narrative_nodes(owner_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_edges_owner ON narrative_edges(owner_id);
    CREATE INDEX IF NOT EXISTS idx_external_attachments_owner ON external_attachments(owner_id);
    CREATE INDEX IF NOT EXISTS idx_consent_records_owner_scope ON consent_records(owner_id, scope);
  `);
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
    triggerRequests: new SqliteTriggerRequestRepository(path),
    narrativeNodes: new SqliteNarrativeNodeRepository(path, 'narrative_nodes'),
    narrativeEdges: new SqliteNarrativeEdgeRepository(path, 'narrative_edges'),
    externalAttachments: new SqliteExternalAttachmentRepository(path, 'external_attachments'),
    consents: new SqliteConsentRepository(path),
  };
};
