import type {
  BeneficiaryRepository,
  BeliefRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  ValueProfileRepository,
} from '@capsule/core';
import { EXPORT_SCHEMA_VERSION_V1, type CapsuleExportPayloadV1, type ExportTransmissionRule } from './schema.js';
import { renderExportPdf } from './pdf.js';

declare const Buffer: {
  from(input: string | Uint8Array, encoding?: string): { toString(encoding: string): string };
};

export interface ExportAggregatorDependencies {
  memories: MemoryRepository;
  beliefs: BeliefRepository;
  lessons: LessonRepository;
  valueProfiles: ValueProfileRepository;
  legacyMessages: LegacyMessageRepository;
  beneficiaries: BeneficiaryRepository;
}

export type ExportFormat = 'json' | 'pdf';

export interface SerializedExport {
  mimeType: 'application/json' | 'application/pdf';
  payloadBase64: string;
}

const encodeBase64 = (content: string | Uint8Array): string => {
  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8').toString('base64');
  }
  return Buffer.from(content).toString('base64');
};

export const serializeExportPayload = (payload: CapsuleExportPayloadV1, format: ExportFormat): SerializedExport => {
  if (format === 'pdf') {
    return {
      mimeType: 'application/pdf',
      payloadBase64: encodeBase64(renderExportPdf(payload)),
    };
  }

  return {
    mimeType: 'application/json',
    payloadBase64: encodeBase64(JSON.stringify(payload, null, 2)),
  };
};

export class ExportAggregator {
  public constructor(private readonly deps: ExportAggregatorDependencies) {}

  private static buildTransmissionRules(payload: {
    legacyMessages: Array<{ id: string; beneficiary_ids: string[] }>;
  }): ExportTransmissionRule[] {
    const rules = payload.legacyMessages
      .flatMap((message) => message.beneficiary_ids.map((beneficiaryId) => ({
        legacy_message_id: message.id,
        beneficiary_id: beneficiaryId,
      })))
      .sort((left, right) => {
        if (left.legacy_message_id === right.legacy_message_id) {
          return left.beneficiary_id.localeCompare(right.beneficiary_id);
        }
        return left.legacy_message_id.localeCompare(right.legacy_message_id);
      });

    const deduped: ExportTransmissionRule[] = [];
    const seen = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.legacy_message_id}:${rule.beneficiary_id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(rule);
    }

    return deduped;
  }

  public async collectByOwner(ownerId: string, generatedByUserId: string): Promise<CapsuleExportPayloadV1> {
    const [memories, beliefs, lessons, valueProfiles, legacyMessages, beneficiaries] = await Promise.all([
      this.deps.memories.listByOwner(ownerId),
      this.deps.beliefs.listByOwner(ownerId),
      this.deps.lessons.listByOwner(ownerId),
      this.deps.valueProfiles.listByOwner(ownerId),
      this.deps.legacyMessages.listByOwner(ownerId),
      this.deps.beneficiaries.listByOwner(ownerId),
    ]);

    return {
      metadata: {
        schema_version: EXPORT_SCHEMA_VERSION_V1,
        exported_at: new Date().toISOString(),
        owner_id: ownerId,
        generated_by_user_id: generatedByUserId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      },
      memories,
      beliefs,
      lessons,
      value_profiles: valueProfiles,
      legacy_messages: legacyMessages,
      beneficiaries,
      transmission_rules: ExportAggregator.buildTransmissionRules({ legacyMessages }),
    };
  }
}
