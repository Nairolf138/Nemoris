import type {
  BeneficiaryRepository,
  BeliefRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  ValueProfileRepository,
} from '@capsule/core';
import {
  EXPORT_SCHEMA_VERSION_V1,
  type CapsuleExportPayloadV1,
  type ExportFamilyDossier,
  type ExportTransmissionRule,
} from './schema.js';
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

const sanitizeSensitiveText = (value?: string): string | undefined => {
  if (!value) {
    return value;
  }

  return value
    .replace(/(mot\s*de\s*passe\s*[:=]\s*)([^,;.\n]+)/gi, '$1[REDACTED]')
    .replace(/(password\s*[:=]\s*)([^,;.\n]+)/gi, '$1[REDACTED]');
};

const formatTrigger = (triggerType: string, triggerAt?: string): string => {
  if (triggerType === 'date') {
    return triggerAt ? `Date programmée (${triggerAt})` : 'Date programmée';
  }
  if (triggerType === 'inactivity') {
    return 'Inactivité détectée';
  }
  if (triggerType === 'verified_death') {
    return 'Vérification du décès';
  }
  return 'Déclenchement manuel';
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

  private static buildFamilyDossier(payload: {
    lessons: Array<{ id: string; title: string; lesson_text: string; severity?: 'low' | 'medium' | 'high' | 'critical' }>;
    memories: Array<{ id: string; title: string; description?: string; memory_type?: 'event' | 'document' | 'media' | 'note' }>;
    legacyMessages: Array<{ id: string; title: string; trigger_type: string; trigger_at?: string; beneficiary_ids: string[] }>;
    beneficiaries: Array<{ id: string; identity: string; channel: 'email' | 'sms' | 'postal'; contact: string; verification_status: 'pending' | 'verified' | 'rejected' }>;
    transmissionRules: ExportTransmissionRule[];
  }): ExportFamilyDossier {
    const beneficiariesById = new Map(payload.beneficiaries.map((beneficiary) => [beneficiary.id, beneficiary]));

    const practicalInstructions = payload.lessons.map((lesson) => ({
      lesson_id: lesson.id,
      title: lesson.title,
      instruction: lesson.lesson_text,
      severity: lesson.severity,
    }));

    const accountCandidates = payload.memories.filter((memory) => {
      if (memory.memory_type !== 'document' && memory.memory_type !== 'media') {
        return false;
      }
      const haystack = `${memory.title} ${memory.description ?? ''}`.toLowerCase();
      return ['compte', 'account', 'abonnement', 'assurance', 'banque', 'espace client'].some((term) => haystack.includes(term));
    });

    const reportableAccounts = accountCandidates.map((memory) => ({
      memory_id: memory.id,
      label: memory.title,
      details: sanitizeSensitiveText(memory.description),
      password_included: false as const,
    }));

    const documentsLinks = payload.memories
      .filter((memory) => memory.memory_type === 'document' || memory.memory_type === 'media')
      .map((memory) => ({
        memory_id: memory.id,
        title: memory.title,
        reference: sanitizeSensitiveText(memory.description) ?? 'Aucune référence explicite',
      }));

    const messages = payload.legacyMessages.map((message) => ({
      legacy_message_id: message.id,
      title: message.title,
      trigger: formatTrigger(message.trigger_type, message.trigger_at),
      beneficiaries: message.beneficiary_ids
        .map((beneficiaryId) => beneficiariesById.get(beneficiaryId)?.identity ?? beneficiaryId),
    }));

    return {
      practical_instructions: practicalInstructions,
      reportable_accounts: reportableAccounts,
      messages,
      documents_links: documentsLinks,
      beneficiaries_rules: {
        beneficiaries: payload.beneficiaries.map((beneficiary) => ({
          beneficiary_id: beneficiary.id,
          identity: beneficiary.identity,
          channel: beneficiary.channel,
          contact: beneficiary.contact,
          verification_status: beneficiary.verification_status,
        })),
        transmission_rules: payload.transmissionRules,
      },
    };
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

    const transmissionRules = ExportAggregator.buildTransmissionRules({ legacyMessages });

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
      transmission_rules: transmissionRules,
      family_dossier: ExportAggregator.buildFamilyDossier({
        lessons,
        memories,
        legacyMessages,
        beneficiaries,
        transmissionRules,
      }),
    };
  }
}
