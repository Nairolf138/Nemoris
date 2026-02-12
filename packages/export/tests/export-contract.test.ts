declare const Buffer: {
  from(input: string, encoding: 'base64' | 'utf8'): { toString(encoding: 'utf8'): string };
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
        occurred_at: '2025-12-31T00:00:00.000Z', title: 'Souvenir A', description: 'Description souvenir A',
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
        title: 'Message testamentaire', message: 'Prenez soin de vous.', trigger_type: 'manual', recipient_ids: ['benef-1', 'benef-2'], attachment_memory_ids: ['mem-1'],
        related_belief_ids: ['belief-1'], related_lesson_ids: ['lesson-1'], related_value_profile_ids: ['vp-1'], related_narrative_node_ids: [], state: 'armed',
      },
    ],
  };

  return {
    memories: { listByOwner: async (owner: string) => fixture.memories.filter((x) => x.owner_id === owner) },
    beliefs: { listByOwner: async (owner: string) => fixture.beliefs.filter((x) => x.owner_id === owner) },
    lessons: { listByOwner: async (owner: string) => fixture.lessons.filter((x) => x.owner_id === owner) },
    valueProfiles: { listByOwner: async (owner: string) => fixture.valueProfiles.filter((x) => x.owner_id === owner) },
    legacyMessages: { listByOwner: async (owner: string) => fixture.legacyMessages.filter((x) => x.owner_id === owner) },
  };
};

export const runExportContractTests = async (): Promise<void> => {
  const aggregator = new ExportAggregator(buildFixture() as any);
  const payload = await aggregator.collectByOwner(ownerId, ownerId);

  assert(payload.metadata.schema_version === '1.0.0', 'schema version must be v1');
  const snapshot = JSON.stringify({
    schema_version: payload.metadata.schema_version,
    owner_id: payload.metadata.owner_id,
    counts: {
      memories: payload.memories.length,
      beliefs: payload.beliefs.length,
      lessons: payload.lessons.length,
      value_profiles: payload.value_profiles.length,
      legacy_messages: payload.legacy_messages.length,
    },
  });

  assert(
    snapshot === JSON.stringify({ schema_version: '1.0.0', owner_id: 'owner-1', counts: { memories: 1, beliefs: 1, lessons: 1, value_profiles: 1, legacy_messages: 1 } }),
    'JSON contract snapshot changed',
  );

  const serializedJson = serializeExportPayload(payload, 'json');
  assert(serializedJson.mimeType === 'application/json', 'JSON export should expose JSON mimetype');
  const decodedJson = JSON.parse(Buffer.from(serializedJson.payloadBase64, 'base64').toString('utf8')) as typeof payload;
  assert(decodedJson.legacy_messages[0]?.title === 'Message testamentaire', 'JSON serialization should preserve message title');

  const serializedPdf = serializeExportPayload(payload, 'pdf');
  assert(serializedPdf.mimeType === 'application/pdf', 'PDF export should expose PDF mimetype');
  const pdfText = Buffer.from(serializedPdf.payloadBase64, 'base64').toString('utf8');
  assert(pdfText.startsWith('%PDF-1.4'), 'invalid PDF header');
  assert(pdfText.includes('(Messages) Tj'), 'missing messages section');
  assert(pdfText.includes('(Souvenirs) Tj'), 'missing souvenirs section');
  assert(pdfText.includes('(Consignes) Tj'), 'missing consignes section');
  assert(pdfText.includes('(Beneficiaires) Tj'), 'missing beneficiaries section');
};
