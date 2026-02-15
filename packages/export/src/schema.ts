import type { Beneficiary, Belief, LegacyMessage, Lesson, Memory, ValueProfile } from '@capsule/core';

export type ExportSchemaVersion = '1.1.0';

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
  family_dossier: ExportFamilyDossier;
}

export interface ExportFamilyDossier {
  practical_instructions: ExportPracticalInstruction[];
  reportable_accounts: ExportReportableAccount[];
  messages: ExportMessageSummary[];
  documents_links: ExportDocumentLink[];
  beneficiaries_rules: ExportBeneficiariesRules;
}

export interface ExportPracticalInstruction {
  lesson_id: string;
  title: string;
  instruction: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExportReportableAccount {
  memory_id: string;
  label: string;
  details?: string;
  password_included: false;
}

export interface ExportMessageSummary {
  legacy_message_id: string;
  title: string;
  trigger: string;
  beneficiaries: string[];
}

export interface ExportDocumentLink {
  memory_id: string;
  title: string;
  reference: string;
}

export interface ExportBeneficiariesRules {
  beneficiaries: Array<{
    beneficiary_id: string;
    identity: string;
    channel: Beneficiary['channel'];
    contact: string;
    verification_status: Beneficiary['verification_status'];
  }>;
  transmission_rules: ExportTransmissionRule[];
}

export interface ExportTransmissionRule {
  legacy_message_id: string;
  beneficiary_id: string;
}

export const EXPORT_SCHEMA_VERSION_V1: ExportSchemaVersion = '1.1.0';

export interface ExportBeneficiary {
  beneficiary_id: string;
  identity: string;
  message_count: number;
}
