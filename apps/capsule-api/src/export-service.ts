import type { ExportAggregator } from '../../../packages/export/dist/src/aggregator.js';
import { serializeExportPayload, type ExportFormat } from '../../../packages/export/dist/src/aggregator.js';

export type { ExportFormat };

export interface ExportRecord {
  id: string;
  owner_id: string;
  requested_by_user_id: string;
  format: ExportFormat;
  created_at: string;
  payload: string;
  mime_type: 'application/json' | 'application/pdf';
  file_name: string;
}

export interface ExportAuditLog {
  export_id: string;
  owner_id: string;
  requested_by_user_id: string;
  format: ExportFormat;
  created_at: string;
}

export class ExportService {
  private readonly exportsById = new Map<string, ExportRecord>();
  private readonly auditTrail: ExportAuditLog[] = [];

  public constructor(private readonly aggregator: Pick<ExportAggregator, 'collectByOwner'>) {}

  public async createExport(ownerId: string, requestedByUserId: string, format: ExportFormat): Promise<ExportRecord> {
    const payload = await this.aggregator.collectByOwner(ownerId, requestedByUserId);
    const serialized = serializeExportPayload(payload, format);

    const exportId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const isPdf = format === 'pdf';

    const record: ExportRecord = {
      id: exportId,
      owner_id: ownerId,
      requested_by_user_id: requestedByUserId,
      format,
      created_at: createdAt,
      payload: serialized.payloadBase64,
      mime_type: serialized.mimeType,
      file_name: `capsule-export-${ownerId}-${createdAt}.${isPdf ? 'pdf' : 'json'}`,
    };

    this.exportsById.set(record.id, record);
    this.auditTrail.push({
      export_id: record.id,
      owner_id: ownerId,
      requested_by_user_id: requestedByUserId,
      format,
      created_at: createdAt,
    });

    return record;
  }

  public getExport(ownerId: string, exportId: string): ExportRecord {
    const record = this.exportsById.get(exportId);
    if (!record || record.owner_id !== ownerId) {
      throw new Error('EXPORT_NOT_FOUND');
    }
    return record;
  }

  public listAuditByOwner(ownerId: string): ExportAuditLog[] {
    return this.auditTrail.filter((entry) => entry.owner_id === ownerId);
  }
}
