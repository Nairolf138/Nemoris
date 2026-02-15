import type { CapsuleExportPayloadV1, ExportBeneficiary } from './schema.js';

const escapePdfText = (value: string): string => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

const getBeneficiaries = (payload: CapsuleExportPayloadV1): ExportBeneficiary[] => {
  const counts = new Map<string, number>();
  for (const rule of payload.transmission_rules) {
    counts.set(rule.beneficiary_id, (counts.get(rule.beneficiary_id) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([beneficiary_id, message_count]) => {
    const beneficiary = payload.beneficiaries.find((entry) => entry.id === beneficiary_id);
    return { beneficiary_id, identity: beneficiary?.identity ?? beneficiary_id, message_count };
  });
};

const documentMemories = (payload: CapsuleExportPayloadV1): CapsuleExportPayloadV1['memories'] =>
  payload.memories.filter((memory) => memory.memory_type === 'document' || memory.memory_type === 'media');

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

const buildLines = (payload: CapsuleExportPayloadV1): string[] => {
  const beneficiaries = getBeneficiaries(payload);
  const beneficiariesById = new Map(payload.beneficiaries.map((beneficiary) => [beneficiary.id, beneficiary]));
  const docs = documentMemories(payload);

  const lines = [
    'Dossier famille Capsule',
    `Profil: ${payload.metadata.owner_id}`,
    `Date de génération: ${payload.metadata.exported_at}`,
    '',
    'Messages à transmettre',
    ...payload.legacy_messages.flatMap((message) => [
      `- ${message.title}`,
      `  Contenu: ${message.message}`,
      `  Déclenchement: ${formatTrigger(message.trigger_type, message.trigger_at)}`,
    ]),
    '',
    'Documents et liens utiles',
    ...(docs.length > 0
      ? docs.flatMap((document) => [`- ${document.title}`, `  Référence: ${document.description ?? 'Aucun lien explicite'}`])
      : ['- Aucun document identifié dans la capsule.']),
    '',
    'Bénéficiaires',
    ...payload.beneficiaries.map(
      (beneficiary) => `- ${beneficiary.identity} · ${beneficiary.channel} (${beneficiary.contact}) [${beneficiary.verification_status}]`,
    ),
    '',
    'Règles de déclenchement',
    ...payload.legacy_messages.flatMap((message) => {
      const recipients = message.beneficiary_ids
        .map((beneficiaryId) => beneficiariesById.get(beneficiaryId)?.identity ?? beneficiaryId)
        .join(', ');
      return [`- ${message.title}`, `  ${formatTrigger(message.trigger_type, message.trigger_at)} -> ${recipients || 'Aucun bénéficiaire'}`];
    }),
    '',
    'Répartition synthétique',
    ...beneficiaries.map((beneficiary) => `- ${beneficiary.identity}: ${beneficiary.message_count} message(s)`),
  ];

  return lines.map((line) => escapePdfText(line));
};

export const renderExportPdf = (payload: CapsuleExportPayloadV1): Uint8Array => {
  const lines = buildLines(payload);
  const stream = ['BT', '/F1 11 Tf', '50 780 Td'];

  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) {
      stream.push('0 -14 Td');
    }
    stream.push(`(${lines[i]}) Tj`);
  }

  stream.push('ET');
  const contentStream = stream.join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};
