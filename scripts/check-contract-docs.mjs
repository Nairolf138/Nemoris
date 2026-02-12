import { readFileSync, existsSync } from 'node:fs';

const requiredDocs = [
  'docs/product-capsule/scope-fonctionnel.md',
  'docs/product-capsule/roadmap-shipping.md',
  'docs/operations/env-secrets-management.md',
  'docs/operations/incident-runbook.md',
  'docs/operations/go-no-go-checklist.md'
];

const requiredRoadmapLots = ['Lot 0', 'Lot 1', 'Lot 2', 'Lot 3'];
const requiredChecklistSections = [
  'Gate de scope',
  'Lot 0 — Cadrage',
  'Lot 1 — Fondations produit',
  'Lot 2 — Valeur utilisateur',
  'Lot 3 — Hardening avant release'
];

for (const docPath of requiredDocs) {
  if (!existsSync(docPath)) {
    console.error(`Missing required contractual document: ${docPath}`);
    process.exit(1);
  }
}

const roadmap = readFileSync('docs/product-capsule/roadmap-shipping.md', 'utf8');
for (const lot of requiredRoadmapLots) {
  if (!roadmap.includes(lot)) {
    console.error(`Roadmap shipping is missing expected section: ${lot}`);
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
