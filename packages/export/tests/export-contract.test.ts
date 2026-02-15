declare const Buffer: {
  from(input: string, encoding: 'base64' | 'utf8'): { toString(encoding: string): string };
};

import { ExportAggregator, serializeExportPayload } from '../src/aggregator.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const ownerId = 'owner-1';

const buildFixture = () => {
  const fixture = {
    memories: [
      {
        id: 'mem-1', owner_id: ownerId, visibility: 'private', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        occurred_at: '2025-12-31T00:00:00.000Z', title: 'Compte assurance vie', description: 'Identifiant dossier A-01, mot de passe: secret', memory_type: 'document',
        related_belief_ids: ['belief-1'], related_lesson_ids: ['lesson-1'], related_value_profile_ids: ['vp-1'], related_narrative_node_ids: [],
      },
    ],
    beliefs: [
      {
        id: 'belief-1', owner_id: ownerId, visibility: 'private', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        belief_key: 'finance.prudence', statement: 'Rester prudent', status: 'active', current_version_number: 1, evidence_memory_ids: ['mem-1'], related_lesson_ids: ['lesson-1'],
      },
    ],
    lessons: [
      {
        id: 'lesson-1', owner_id: ownerId, visibility: 'trusted_circle', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        title: 'Consigne principale', lesson_text: 'Toujours vérifier deux fois.', source_memory_ids: ['mem-1'], linked_belief_ids: ['belief-1'], linked_value_profile_ids: ['vp-1'],
      },
    ],
    valueProfiles: [
      {
        id: 'vp-1', owner_id: ownerId, visibility: 'private', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        profile_label: 'Valeurs fondatrices', values: [{ value_id: 'integrity', label: 'Intégrité', score: 9 }], current_version_number: 1, evidence_memory_ids: ['mem-1'], narrative_node_ids: [],
      },
    ],
    legacyMessages: [
      {
        id: 'msg-1', owner_id: ownerId, visibility: 'posthumous', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        title: 'Message testamentaire', message: 'Prenez soin de vous.', trigger_type: 'manual', beneficiary_ids: ['benef-1', 'benef-2', 'benef-1'], attachment_memory_ids: ['mem-1'],
        related_belief_ids: ['belief-1'], related_lesson_ids: ['lesson-1'], related_value_profile_ids: ['vp-1'], related_narrative_node_ids: [], state: 'armed',
      },
    ],
    beneficiaries: [
      { id: 'benef-1', owner_id: ownerId, visibility: 'private', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', identity: 'Alex', channel: 'email', contact: 'alex@example.com', verification_status: 'verified', status: 'active' },
      { id: 'benef-2', owner_id: ownerId, visibility: 'private', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', identity: 'Sam', channel: 'sms', contact: '+33123456789', verification_status: 'verified', status: 'active' },
    ],
  };

  return {
    memories: { listByOwner: async (owner: string) => fixture.memories.filter((x) => x.owner_id === owner) },
    beliefs: { listByOwner: async (owner: string) => fixture.beliefs.filter((x) => x.owner_id === owner) },
    lessons: { listByOwner: async (owner: string) => fixture.lessons.filter((x) => x.owner_id === owner) },
    valueProfiles: { listByOwner: async (owner: string) => fixture.valueProfiles.filter((x) => x.owner_id === owner) },
    legacyMessages: { listByOwner: async (owner: string) => fixture.legacyMessages.filter((x) => x.owner_id === owner) },
    beneficiaries: { listByOwner: async (owner: string) => fixture.beneficiaries.filter((x) => x.owner_id === owner) },
  };
};

export const runExportContractTests = async (): Promise<void> => {
  const aggregator = new ExportAggregator(buildFixture() as any);
  const payload = await aggregator.collectByOwner(ownerId, ownerId);

  assert(payload.metadata.schema_version === '1.1.0', 'schema version must be v1.1.0');
  assert(payload.metadata.generated_by_user_id === ownerId, 'generator user id should be set in metadata');
  assert(payload.metadata.exported_at.length > 0, 'export timestamp should be set in metadata');
  assert(payload.metadata.timezone.length > 0, 'timezone should be set in metadata');
  const snapshot = JSON.stringify({
    schema_version: payload.metadata.schema_version,
    owner_id: payload.metadata.owner_id,
    counts: {
      memories: payload.memories.length,
      beliefs: payload.beliefs.length,
      lessons: payload.lessons.length,
      value_profiles: payload.value_profiles.length,
      legacy_messages: payload.legacy_messages.length,
      beneficiaries: payload.beneficiaries.length,
      transmission_rules: payload.transmission_rules.length,
      practical_instructions: payload.family_dossier.practical_instructions.length,
      reportable_accounts: payload.family_dossier.reportable_accounts.length,
    },
  });

  assert(
    snapshot === JSON.stringify({ schema_version: '1.1.0', owner_id: 'owner-1', counts: { memories: 1, beliefs: 1, lessons: 1, value_profiles: 1, legacy_messages: 1, beneficiaries: 2, transmission_rules: 2, practical_instructions: 1, reportable_accounts: 1 } }),
    'JSON contract snapshot changed',
  );
  assert(
    payload.transmission_rules[0]?.legacy_message_id === 'msg-1' && payload.transmission_rules[0]?.beneficiary_id === 'benef-1'
      && payload.transmission_rules[1]?.legacy_message_id === 'msg-1' && payload.transmission_rules[1]?.beneficiary_id === 'benef-2',
    'transmission rules should be sorted and deduplicated by message and beneficiary',
  );

  assert(payload.family_dossier.reportable_accounts[0]?.password_included === false, 'accounts must not embed passwords');
  assert(
    payload.family_dossier.reportable_accounts[0]?.details?.includes('[REDACTED]'),
    'sensitive password-like fields should be redacted from account details',
  );

  const serializedJson = await serializeExportPayload(payload, 'json');
  assert(serializedJson.mimeType === 'application/json', 'JSON export should expose JSON mimetype');
  const decodedJson = JSON.parse(Buffer.from(serializedJson.payloadBase64, 'base64').toString('utf8')) as typeof payload;
  assert(decodedJson.family_dossier.messages[0]?.title === 'Message testamentaire', 'JSON serialization should preserve family dossier messages');

  const serializedPdf = await serializeExportPayload(payload, 'pdf');
  assert(serializedPdf.mimeType === 'application/pdf', 'PDF export should expose PDF mimetype');
  const pdfText = Buffer.from(serializedPdf.payloadBase64, 'base64').toString('utf8');
  assert(pdfText.startsWith('%PDF-1.4'), 'invalid PDF header');
  assert(pdfText.includes('(DOSSIER FAMILLE CAPSULE) Tj'), 'missing family dossier title');
  assert(pdfText.includes('(Sommaire) Tj'), 'missing summary section');
  assert(pdfText.includes('(1. Instructions pratiques) Tj'), 'missing instructions section');
  assert(pdfText.includes('(2. Comptes à signaler') && pdfText.includes('sans mots de passe'), 'missing accounts section');
  assert(pdfText.includes('(3. Messages à transmettre) Tj'), 'missing messages section');
  assert(pdfText.includes('(4. Documents et liens) Tj'), 'missing documents section');
  assert(pdfText.includes('(5. Bénéficiaires et règles) Tj'), 'missing beneficiaries/rules section');


  const serializedEncryptedZip = await serializeExportPayload(payload, 'encrypted_zip', {
    vaultFiles: [
      {
        id: 'vault-1',
        filename: 'testament.pdf',
        mime: 'application/pdf',
        size: 16,
        hash: 'hash-vault-1',
        created_at: '2026-01-01T00:00:00.000Z',
        visibility: 'private',
        content_base64: Buffer.from('vault-content', 'utf8').toString('base64'),
      },
    ],
    encryption: { strategy: 'dedicated_key', secret: 'unit-test-export-key' },
  });
  assert(serializedEncryptedZip.mimeType === 'application/zip+encrypted', 'encrypted zip should expose encrypted zip mimetype');
  const envelope = Buffer.from(serializedEncryptedZip.payloadBase64, 'base64').toString('utf8');
  assert(envelope.startsWith('enczip1.dedicated_key.'), 'encrypted zip should expose expected envelope format');
};
