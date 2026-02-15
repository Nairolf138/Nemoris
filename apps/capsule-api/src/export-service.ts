import type { ExportAggregator, ExportVaultFile } from '@capsule/export';
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
  mime_type: 'application/json' | 'application/pdf' | 'application/zip+encrypted';
  file_name: string;
}

export interface ExportAuditLog {
  export_id: string;
  owner_id: string;
  requested_by_user_id: string;
  format: ExportFormat;
  created_at: string;
}

export interface CreateExportOptions {
  vaultFiles?: ExportVaultFile[];
  encryption?: {
    strategy: 'dedicated_key' | 'user_password';
    secret: string;
    keyId?: string;
    iterations?: number;
  };
}

export class ExportService {
  public constructor(
    private readonly aggregator: Pick<ExportAggregator, 'collectByOwner'>,
    private readonly repository: ExportRepository,
  ) {}

  public async createExport(ownerId: string, requestedByUserId: string, format: ExportFormat, options: CreateExportOptions = {}): Promise<ExportRecord> {
    const payload = await this.aggregator.collectByOwner(ownerId, requestedByUserId);
    const serialized = await serializeExportPayload(payload, format, {
      vaultFiles: options.vaultFiles,
      encryption: options.encryption,
    });

    const exportId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const extensionByFormat: Record<ExportFormat, string> = {
      json: 'json',
      pdf: 'pdf',
      encrypted_zip: 'zip.enc',
    };

    const record: ExportRecord = {
      id: exportId,
      owner_id: ownerId,
      requested_by_user_id: requestedByUserId,
      format,
      created_at: createdAt,
      payload: serialized.payloadBase64,
      mime_type: serialized.mimeType,
      file_name: `capsule-export-${ownerId}-${createdAt}.${extensionByFormat[format]}`,
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
