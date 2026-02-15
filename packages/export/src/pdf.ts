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

const appendSection = (lines: string[], title: string, content: string[]): void => {
  lines.push(title);
  lines.push('-'.repeat(title.length));
  if (content.length === 0) {
    lines.push('- Aucune donnée disponible.');
  } else {
    lines.push(...content);
  }
  lines.push('');
};

const buildLines = (payload: CapsuleExportPayloadV1): string[] => {
  const beneficiaries = getBeneficiaries(payload);
  const rulesByMessageId = new Map(payload.transmission_rules.map((rule) => [rule.legacy_message_id, rule]));

  const lines: string[] = [
    'DOSSIER FAMILLE CAPSULE',
    `Profil: ${payload.metadata.owner_id}`,
    `Date de génération: ${payload.metadata.exported_at}`,
    `Fuseau horaire: ${payload.metadata.timezone}`,
    '',
    'Sommaire',
    '1. Instructions pratiques',
    '2. Comptes à signaler',
    '3. Messages à transmettre',
    '4. Documents et liens',
    '5. Bénéficiaires et règles',
    '',
  ];

  appendSection(
    lines,
    '1. Instructions pratiques',
    payload.family_dossier.practical_instructions.map(
      (instruction) => `- ${instruction.title}: ${instruction.instruction}${instruction.severity ? ` [${instruction.severity}]` : ''}`,
    ),
  );

  appendSection(
    lines,
    '2. Comptes à signaler (sans mots de passe)',
    payload.family_dossier.reportable_accounts.map(
      (account) => `- ${account.label}${account.details ? ` · ${account.details}` : ''}`,
    ),
  );

  appendSection(
    lines,
    '3. Messages à transmettre',
    payload.family_dossier.messages.flatMap((message) => [
      `- ${message.title}`,
      `  Déclenchement: ${message.trigger}`,
      `  Bénéficiaires: ${message.beneficiaries.join(', ') || 'Aucun bénéficiaire'}`,
    ]),
  );

  appendSection(
    lines,
    '4. Documents et liens',
    payload.family_dossier.documents_links.map((document) => `- ${document.title} · ${document.reference}`),
  );

  appendSection(
    lines,
    '5. Bénéficiaires et règles',
    [
      ...payload.family_dossier.beneficiaries_rules.beneficiaries.map(
        (beneficiary) =>
          `- ${beneficiary.identity} · ${beneficiary.channel} (${beneficiary.contact}) [${beneficiary.verification_status}]`,
      ),
      ...payload.legacy_messages.flatMap((message) => {
        const recipients = message.beneficiary_ids
          .map((beneficiaryId: string) => payload.beneficiaries.find((entry) => entry.id === beneficiaryId)?.identity ?? beneficiaryId)
          .join(', ');
        const isConfigured = rulesByMessageId.has(message.id);
        return [
          `- Règle: ${message.title}`,
          `  ${message.trigger_type}${message.trigger_at ? ` (${message.trigger_at})` : ''} -> ${recipients || 'Aucun bénéficiaire'}${isConfigured ? '' : ' [Non configuré]'}`,
        ];
      }),
      ...beneficiaries.map((beneficiary) => `- Synthèse: ${beneficiary.identity}: ${beneficiary.message_count} message(s)`),
    ],
  );

  return lines.map((line) => escapePdfText(line));
};

export const renderExportPdf = (payload: CapsuleExportPayloadV1): Uint8Array => {
  const lines = buildLines(payload);
  const pageHeight = 792;
  const topMargin = 760;
  const lineHeight = 14;
  const maxLinesPerPage = Math.floor((topMargin - 40) / lineHeight);

  const pages: string[] = [];

  for (let start = 0; start < lines.length; start += maxLinesPerPage) {
    const pageLines = lines.slice(start, start + maxLinesPerPage);
    const stream = ['BT', '/F1 11 Tf', `50 ${topMargin} Td`];

    for (let i = 0; i < pageLines.length; i += 1) {
      if (i > 0) {
        stream.push(`0 -${lineHeight} Td`);
      }
      stream.push(`(${pageLines[i]}) Tj`);
    }

    stream.push('ET');
    pages.push(stream.join('\n'));
  }

  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');

  const pageObjectNumbers: number[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    const pageObjectNumber = 3 + i;
    const contentObjectNumber = 3 + pages.length + i;
    pageObjectNumbers.push(pageObjectNumber);
    objects.push(
      `${pageObjectNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 ${3 + (pages.length * 2)} 0 R >> >> /Contents ${contentObjectNumber} 0 R >> endobj`,
    );
  }

  for (let i = 0; i < pages.length; i += 1) {
    const content = pages[i];
    const contentObjectNumber = 3 + pages.length + i;
    objects.push(`${contentObjectNumber} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`);
  }

  const fontObjectNumber = 3 + (pages.length * 2);
  objects.splice(1, 0, `2 0 obj << /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >> endobj`);
  objects.push(`${fontObjectNumber} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

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
