import type { Beneficiary, Belief, LegacyMessage, Lesson, Memory, ValueProfile } from '@capsule/core';

export type ExportSchemaVersion = '1.0.0';

export interface ExportMetadata {
  schema_version: ExportSchemaVersion;
  exported_at: string;
  owner_id: string;
  generated_by_user_id: string;
  timezone: string;
}

export interface CapsuleExportPayloadV1 {
  metadata: ExportMetadata;
  memories: Memory[];
  beliefs: Belief[];
  lessons: Lesson[];
  value_profiles: ValueProfile[];
  legacy_messages: LegacyMessage[];
  beneficiaries: Beneficiary[];
  transmission_rules: ExportTransmissionRule[];
}

export interface ExportTransmissionRule {
  legacy_message_id: string;
  beneficiary_id: string;
}

export interface ExportBeneficiary {
  beneficiary_id: string;
  identity: string;
  message_count: number;
}
