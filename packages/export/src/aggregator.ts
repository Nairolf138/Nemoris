import type {
  BeneficiaryRepository,
  BeliefRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  ValueProfileRepository,
  Visibility,
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

const textEncoder = new TextEncoder();

export interface ExportAggregatorDependencies {
  memories: MemoryRepository;
  beliefs: BeliefRepository;
  lessons: LessonRepository;
  valueProfiles: ValueProfileRepository;
  legacyMessages: LegacyMessageRepository;
  beneficiaries: BeneficiaryRepository;
}

export type ExportFormat = 'json' | 'pdf' | 'encrypted_zip';

type ExportMimeType = 'application/json' | 'application/pdf' | 'application/zip+encrypted';

export interface ExportVaultFile {
  id: string;
  filename: string;
  mime: string;
  size: number;
  hash: string;
  created_at: string;
  visibility: Visibility;
  content_base64: string;
}

export type ExportEncryptionStrategy = 'dedicated_key' | 'user_password';

export interface ExportSerializationOptions {
  vaultFiles?: ExportVaultFile[];
  encryption?: {
    strategy: ExportEncryptionStrategy;
    secret: string;
    keyId?: string;
    iterations?: number;
  };
}

export interface SerializedExport {
  mimeType: ExportMimeType;
  payloadBase64: string;
}

interface ZipEntry {
  path: string;
  data: Uint8Array;
}

const encodeBase64 = (content: string | Uint8Array): string => {
  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8').toString('base64');
  }
  return Buffer.from(content).toString('base64');
};

const decodeBase64 = (content: string): Uint8Array => {
  const binary = Buffer.from(content, 'base64').toString('latin1');
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
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

const sanitizeArchivePath = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const crc32 = (data: Uint8Array): number => {
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xEDB88320 & mask);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const pushUint16LE = (target: number[], value: number): void => {
  target.push(value & 0xFF, (value >>> 8) & 0xFF);
};

const pushUint32LE = (target: number[], value: number): void => {
  target.push(value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF);
};

const buildZipArchive = (entries: ZipEntry[]): Uint8Array => {
  const locals: number[] = [];
  const centrals: number[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const fileName = textEncoder.encode(entry.path);
    const crc = crc32(entry.data);
    const compressedSize = entry.data.length;

    const localHeader: number[] = [];
    pushUint32LE(localHeader, 0x04034b50);
    pushUint16LE(localHeader, 20);
    pushUint16LE(localHeader, 0);
    pushUint16LE(localHeader, 0);
    pushUint16LE(localHeader, 0);
    pushUint16LE(localHeader, 0);
    pushUint32LE(localHeader, crc);
    pushUint32LE(localHeader, compressedSize);
    pushUint32LE(localHeader, compressedSize);
    pushUint16LE(localHeader, fileName.length);
    pushUint16LE(localHeader, 0);

    locals.push(...localHeader, ...fileName, ...entry.data);

    const centralHeader: number[] = [];
    pushUint32LE(centralHeader, 0x02014b50);
    pushUint16LE(centralHeader, 20);
    pushUint16LE(centralHeader, 20);
    pushUint16LE(centralHeader, 0);
    pushUint16LE(centralHeader, 0);
    pushUint16LE(centralHeader, 0);
    pushUint16LE(centralHeader, 0);
    pushUint32LE(centralHeader, crc);
    pushUint32LE(centralHeader, compressedSize);
    pushUint32LE(centralHeader, compressedSize);
    pushUint16LE(centralHeader, fileName.length);
    pushUint16LE(centralHeader, 0);
    pushUint16LE(centralHeader, 0);
    pushUint16LE(centralHeader, 0);
    pushUint16LE(centralHeader, 0);
    pushUint32LE(centralHeader, 0);
    pushUint32LE(centralHeader, localOffset);

    centrals.push(...centralHeader, ...fileName);

    localOffset += localHeader.length + fileName.length + compressedSize;
  }

  const centralOffset = locals.length;
  const end: number[] = [];
  pushUint32LE(end, 0x06054b50);
  pushUint16LE(end, 0);
  pushUint16LE(end, 0);
  pushUint16LE(end, entries.length);
  pushUint16LE(end, entries.length);
  pushUint32LE(end, centrals.length);
  pushUint32LE(end, centralOffset);
  pushUint16LE(end, 0);

  return Uint8Array.from([...locals, ...centrals, ...end]);
};

const deriveAesKeyForDedicatedSecret = async (secret: string): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
};

const deriveAesKeyFromPassword = async (password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> => {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
};

const serializeEncryptedZip = async (
  payload: CapsuleExportPayloadV1,
  options: ExportSerializationOptions,
): Promise<SerializedExport> => {
  const vaultFiles = options.vaultFiles ?? [];
  const manifest = {
    manifest_version: '1.0.0',
    export_schema_version: payload.metadata.schema_version,
    generated_at: payload.metadata.exported_at,
    owner_id: payload.metadata.owner_id,
    contents: {
      structured_json: 'payload.json',
      vault_file_count: vaultFiles.length,
      vault_files: vaultFiles.map((file) => ({
        id: file.id,
        path: `vault/${file.id}-${sanitizeArchivePath(file.filename)}`,
        filename: file.filename,
        mime: file.mime,
        size: file.size,
        hash: file.hash,
        created_at: file.created_at,
        visibility: file.visibility,
      })),
    },
  };

  const zipEntries: ZipEntry[] = [
    { path: 'payload.json', data: textEncoder.encode(JSON.stringify(payload, null, 2)) },
    { path: 'manifest.json', data: textEncoder.encode(JSON.stringify(manifest, null, 2)) },
    ...vaultFiles.map((file) => ({
      path: `vault/${file.id}-${sanitizeArchivePath(file.filename)}`,
      data: decodeBase64(file.content_base64),
    })),
  ];

  const archiveBytes = buildZipArchive(zipEntries);
  const strategy = options.encryption?.strategy ?? 'dedicated_key';
  const secret = options.encryption?.secret;
  if (!secret) {
    throw new Error('MISSING_EXPORT_ENCRYPTION_SECRET');
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyId = options.encryption?.keyId ?? 'ez1';
  let key: CryptoKey;
  let salt = '-';
  let iterations = 0;

  if (strategy === 'user_password') {
    iterations = options.encryption?.iterations ?? 120_000;
    const randomSalt = crypto.getRandomValues(new Uint8Array(16));
    salt = encodeBase64(randomSalt);
    key = await deriveAesKeyFromPassword(secret, randomSalt, iterations);
  } else {
    key = await deriveAesKeyForDedicatedSecret(secret);
  }

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, archiveBytes.buffer as ArrayBuffer),
  );

  const envelope = [
    'enczip1',
    strategy,
    keyId,
    encodeBase64(iv),
    salt,
    String(iterations),
    encodeBase64(ciphertext),
  ].join('.');

  return {
    mimeType: 'application/zip+encrypted',
    payloadBase64: encodeBase64(envelope),
  };
};

export const serializeExportPayload = async (
  payload: CapsuleExportPayloadV1,
  format: ExportFormat,
  options: ExportSerializationOptions = {},
): Promise<SerializedExport> => {
  if (format === 'pdf') {
    return {
      mimeType: 'application/pdf',
      payloadBase64: encodeBase64(renderExportPdf(payload)),
    };
  }

  if (format === 'encrypted_zip') {
    return serializeEncryptedZip(payload, options);
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
