declare const Buffer: {
  from(input: string | Uint8Array, encoding?: string): { toString(encoding: string): string };
};

export type ExportFormat = 'json' | 'pdf';

interface ExportPayload {
  metadata: {
    schema_version: '1.0.0';
    exported_at: string;
    owner_id: string;
    generated_by_user_id: string;
    timezone: string;
  };
  memories: Array<{ id: string; owner_id: string; title: string; description?: string }>;
  beliefs: Array<{ id: string; owner_id: string; statement: string }>;
  lessons: Array<{ id: string; owner_id: string; title: string; lesson_text: string }>;
  value_profiles: Array<{ id: string; owner_id: string; profile_label: string }>;
  legacy_messages: Array<{ id: string; owner_id: string; title: string; message: string; recipient_ids: string[] }>;
}

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

const encode = (content: string | Uint8Array): string => {
  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8').toString('base64');
  }
  return Buffer.from(content).toString('base64');
};

const renderPdf = (payload: ExportPayload): Uint8Array => {
  const lines = [
    `Export Capsule - owner ${payload.metadata.owner_id}`,
    `Generated at ${payload.metadata.exported_at}`,
    '',
    'Messages',
    ...payload.legacy_messages.flatMap((message) => [`- ${message.title}`, `  ${message.message}`]),
    '',
    'Souvenirs',
    ...payload.memories.map((memory) => `- ${memory.title}`),
    '',
    'Consignes',
    ...payload.lessons.map((lesson) => `- ${lesson.title}: ${lesson.lesson_text}`),
    '',
    'Beneficiaires',
    ...[...new Set(payload.legacy_messages.flatMap((message) => message.recipient_ids))].map((id) => `- ${id}`),
  ];

  const stream = ['BT', '/F1 11 Tf', '50 780 Td'];
  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) {
      stream.push('0 -14 Td');
    }
    stream.push(`(${lines[i].replaceAll('(', '\\(').replaceAll(')', '\\)')}) Tj`);
  }
  stream.push('ET');

  const content = stream.join('\n');
  const pdf = `%PDF-1.4\n${content}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};

export class ExportService {
  private readonly exportsById = new Map<string, ExportRecord>();
  private readonly auditTrail: ExportAuditLog[] = [];

  public async createExport(ownerId: string, requestedByUserId: string, format: ExportFormat): Promise<ExportRecord> {
    const payload: ExportPayload = {
      metadata: {
        schema_version: '1.0.0',
        exported_at: new Date().toISOString(),
        owner_id: ownerId,
        generated_by_user_id: requestedByUserId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      },
      memories: [],
      beliefs: [],
      lessons: [],
      value_profiles: [],
      legacy_messages: [],
    };

    const exportId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const isPdf = format === 'pdf';

    const record: ExportRecord = {
      id: exportId,
      owner_id: ownerId,
      requested_by_user_id: requestedByUserId,
      format,
      created_at: createdAt,
      payload: isPdf ? encode(renderPdf(payload)) : encode(JSON.stringify(payload, null, 2)),
      mime_type: isPdf ? 'application/pdf' : 'application/json',
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
