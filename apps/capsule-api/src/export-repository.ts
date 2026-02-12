import { execFileSync } from 'node:child_process';
import type { ExportAuditLog, ExportRecord } from './export-service.js';

export interface ExportRepository {
  create(record: ExportRecord): ExportRecord;
  getByIdForOwner(ownerId: string, exportId: string): ExportRecord | undefined;
  listAuditByOwner(ownerId: string): ExportAuditLog[];
}

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const runSql = (dbPath: string, sql: string): string => {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
};

export class InMemoryExportRepository implements ExportRepository {
  private readonly exportsById = new Map<string, ExportRecord>();
  private readonly auditTrail: ExportAuditLog[] = [];

  public create(record: ExportRecord): ExportRecord {
    this.exportsById.set(record.id, record);
    this.auditTrail.push({
      export_id: record.id,
      owner_id: record.owner_id,
      requested_by_user_id: record.requested_by_user_id,
      format: record.format,
      created_at: record.created_at,
    });
    return record;
  }

  public getByIdForOwner(ownerId: string, exportId: string): ExportRecord | undefined {
    const record = this.exportsById.get(exportId);
    if (!record || record.owner_id !== ownerId) {
      return undefined;
    }
    return record;
  }

  public listAuditByOwner(ownerId: string): ExportAuditLog[] {
    return this.auditTrail.filter((entry) => entry.owner_id === ownerId);
  }
}

export class SqliteExportRepository implements ExportRepository {
  public constructor(private readonly path: string) {
    runSql(
      this.path,
      `
      CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        requested_by_user_id TEXT NOT NULL,
        format TEXT NOT NULL,
        created_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_name TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exports_owner_created_at ON exports(owner_id, created_at);
    `,
    );
  }

  public create(record: ExportRecord): ExportRecord {
    runSql(
      this.path,
      `INSERT INTO exports (id, owner_id, requested_by_user_id, format, created_at, payload, mime_type, file_name) VALUES (${quote(record.id)}, ${quote(record.owner_id)}, ${quote(record.requested_by_user_id)}, ${quote(record.format)}, ${quote(record.created_at)}, ${quote(record.payload)}, ${quote(record.mime_type)}, ${quote(record.file_name)});`,
    );
    return record;
  }

  public getByIdForOwner(ownerId: string, exportId: string): ExportRecord | undefined {
    const raw = runSql(
      this.path,
      `SELECT json_object('id', id, 'owner_id', owner_id, 'requested_by_user_id', requested_by_user_id, 'format', format, 'created_at', created_at, 'payload', payload, 'mime_type', mime_type, 'file_name', file_name) FROM exports WHERE id = ${quote(exportId)} AND owner_id = ${quote(ownerId)} LIMIT 1;`,
    ).trim();
    return raw ? (JSON.parse(raw) as ExportRecord) : undefined;
  }

  public listAuditByOwner(ownerId: string): ExportAuditLog[] {
    const raw = runSql(
      this.path,
      `SELECT json_group_array(json_object('export_id', id, 'owner_id', owner_id, 'requested_by_user_id', requested_by_user_id, 'format', format, 'created_at', created_at)) FROM (SELECT id, owner_id, requested_by_user_id, format, created_at FROM exports WHERE owner_id = ${quote(ownerId)} ORDER BY created_at ASC);`,
    ).trim();
    if (!raw || raw === 'null') {
      return [];
    }
    return JSON.parse(raw) as ExportAuditLog[];
  }
}
