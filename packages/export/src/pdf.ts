import type { CapsuleExportPayloadV1, ExportBeneficiary } from './schema.js';

const escapePdfText = (value: string): string => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

const getBeneficiaries = (payload: CapsuleExportPayloadV1): ExportBeneficiary[] => {
  const counts = new Map<string, number>();
  for (const message of payload.legacy_messages) {
    for (const recipientId of message.recipient_ids) {
      counts.set(recipientId, (counts.get(recipientId) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([recipient_id, message_count]) => ({ recipient_id, message_count }));
};

const buildLines = (payload: CapsuleExportPayloadV1): string[] => {
  const beneficiaries = getBeneficiaries(payload);
  const lines = [
    `Export Capsule - owner ${payload.metadata.owner_id}`,
    `Generated at ${payload.metadata.exported_at}`,
    '',
    'Messages',
    ...payload.legacy_messages.flatMap((message) => [`- ${message.title}`, `  ${message.message}`]),
    '',
    'Souvenirs',
    ...payload.memories.flatMap((memory) => [`- ${memory.title}`, `  ${memory.description ?? ''}`]),
    '',
    'Consignes',
    ...payload.lessons.flatMap((lesson) => [`- ${lesson.title}`, `  ${lesson.lesson_text}`]),
    '',
    'Beneficiaires',
    ...beneficiaries.map((beneficiary) => `- ${beneficiary.recipient_id} (${beneficiary.message_count} message(s))`),
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
