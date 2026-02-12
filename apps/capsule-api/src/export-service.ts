import type { ExportAggregator } from '@capsule/export';
import { serializeExportPayload, type ExportFormat } from '@capsule/export';
import { NotFoundError } from './errors.js';
import type { ExportRepository } from './export-repository.js';

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
  public constructor(
    private readonly aggregator: Pick<ExportAggregator, 'collectByOwner'>,
    private readonly repository: ExportRepository,
  ) {}

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

    return this.repository.create(record);
  }

  public getExport(ownerId: string, exportId: string): ExportRecord {
    const record = this.repository.getByIdForOwner(ownerId, exportId);
    if (!record) {
      throw new NotFoundError('EXPORT_NOT_FOUND');
    }
    return record;
  }

  public listAuditByOwner(ownerId: string): ExportAuditLog[] {
    return this.repository.listAuditByOwner(ownerId);
  }
}
