import { readFileSync, existsSync } from 'node:fs';

const requiredDocs = [
  'docs/product-capsule/scope-fonctionnel.md',
  'docs/product-capsule/roadmap-shipping.md',
  'docs/operations/env-secrets-management.md',
  'docs/operations/incident-runbook.md',
  'docs/operations/go-no-go-checklist.md'
];

const requiredRoadmapPhases = ['P0 — Fondation sécurité', 'P1 — Contenu + héritiers', 'P2 — Déclenchement', 'P3 — Messages conditionnels / remise', 'P4 — Guide héritiers', 'P5 — Qualif & conformité', 'P6 — Pilotes partenaires'];
const requiredChecklistSections = [
  'Règle de validation transverse',
  'P0 — Fondation sécurité',
  'P1 — Contenu + héritiers',
  'P2 — Déclenchement',
  'P3 — Messages conditionnels / remise',
  'P4 — Guide héritiers',
  'P5 — Qualif & conformité',
  'P6 — Pilotes partenaires'
];

for (const docPath of requiredDocs) {
  if (!existsSync(docPath)) {
    console.error(`Missing required contractual document: ${docPath}`);
    process.exit(1);
  }
}

const roadmap = readFileSync('docs/product-capsule/roadmap-shipping.md', 'utf8');
for (const phase of requiredRoadmapPhases) {
  if (!roadmap.includes(phase)) {
    console.error(`Roadmap shipping is missing expected section: ${phase}`);
    process.exit(1);
  }
}

const goNoGo = readFileSync('docs/operations/go-no-go-checklist.md', 'utf8');
if (!goNoGo.includes('docs/product-capsule/roadmap-shipping.md')) {
  console.error('Go/No-Go checklist must reference roadmap-shipping.md as alignment source.');
  process.exit(1);
}

for (const section of requiredChecklistSections) {
  if (!goNoGo.includes(section)) {
    console.error(`Go/No-Go checklist is missing expected section: ${section}`);
    process.exit(1);
  }
}

console.log('Contractual documentation checks passed.');
