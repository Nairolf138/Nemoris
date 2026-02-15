import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AuditLogEntry, AuditLogQuery, StandardEvent } from './types.js';

type RuntimeEnv = Record<string, string | undefined>;
const runtimeEnv: RuntimeEnv = ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const normalize = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const buildAuditEntry = (event: StandardEvent, sequence: number): AuditLogEntry => ({
  ...event,
  sequence,
  actor: normalize(event.metadata?.actor ?? event.metadata?.actor_id, event.user_id),
  action: normalize(event.metadata?.action, event.event_name),
  target: normalize(event.metadata?.target, event.entity_id),
  result: normalize(event.metadata?.result ?? event.metadata?.outcome, 'unknown'),
});

const parseAuditEntry = (row: string): AuditLogEntry => {
  const [sequenceRaw, eventName, userId, entityId, timestamp, metadataRaw, actor, action, target, result] = row.split('|');
  return {
    sequence: Number.parseInt(sequenceRaw ?? '0', 10),
    event_name: eventName ?? '',
    user_id: userId ?? '',
    entity_id: entityId ?? '',
    timestamp: timestamp ?? '',
    metadata: JSON.parse(metadataRaw ?? '{}') as Record<string, unknown>,
    actor: actor ?? '',
    action: action ?? '',
    target: target ?? '',
    result: result ?? '',
  };
};

export class ImmutableAuditLog {
  private readonly entries: AuditLogEntry[] = [];
  private readonly dbPath?: string;

  public constructor(dbPath: string | undefined = runtimeEnv.CAPSULE_AUDIT_DB_PATH) {
    if (!dbPath) {
      return;
    }
    this.dbPath = resolve(dbPath);
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.setupSchema();
  }

  public append(event: StandardEvent): AuditLogEntry {
    if (!this.dbPath) {
      const entry = buildAuditEntry(event, this.entries.length + 1);
      this.entries.push(entry);
      return entry;
    }

    const nextSequence = Number.parseInt(this.runSql('SELECT COALESCE(MAX(sequence), 0) + 1 FROM audit_log;').trim(), 10);
    const entry = buildAuditEntry(event, Number.isFinite(nextSequence) ? nextSequence : 1);

    this.runSql(`
      INSERT INTO audit_log (sequence, timestamp, actor, action, target, result, event_name, user_id, entity_id, metadata_json)
      VALUES (
        ${entry.sequence},
        ${quote(entry.timestamp)},
        ${quote(entry.actor)},
        ${quote(entry.action)},
        ${quote(entry.target)},
        ${quote(entry.result)},
        ${quote(entry.event_name)},
        ${quote(entry.user_id)},
        ${quote(entry.entity_id)},
        ${quote(JSON.stringify(entry.metadata))}
      );
    `);

    return entry;
  }

  public list(query: AuditLogQuery = {}): AuditLogEntry[] {
    if (!this.dbPath) {
      return [...this.entries];
    }

    const whereClauses: string[] = [];
    if (query.actor) whereClauses.push(`actor = ${quote(query.actor)}`);
    if (query.action) whereClauses.push(`action = ${quote(query.action)}`);
    if (query.target) whereClauses.push(`target = ${quote(query.target)}`);
    if (query.result) whereClauses.push(`result = ${quote(query.result)}`);

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limitSql = query.limit && query.limit > 0 ? `LIMIT ${Math.floor(query.limit)}` : '';
    const rows = this
      .runSql(`
        SELECT sequence || '|' || event_name || '|' || user_id || '|' || entity_id || '|' || timestamp || '|' || metadata_json || '|' || actor || '|' || action || '|' || target || '|' || result
        FROM audit_log
        ${whereSql}
        ORDER BY sequence ASC
        ${limitSql};
      `)
      .split('\n')
      .filter(Boolean);

    return rows.map(parseAuditEntry);
  }

  private setupSchema(): void {
    this.runSql(`
      CREATE TABLE IF NOT EXISTS audit_log (
        sequence INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        result TEXT NOT NULL,
        event_name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target);
      CREATE INDEX IF NOT EXISTS idx_audit_log_result ON audit_log(result);
    `);
  }

  private runSql(sql: string): string {
    return execFileSync('sqlite3', [this.dbPath as string, sql], { encoding: 'utf8' });
  }
}
