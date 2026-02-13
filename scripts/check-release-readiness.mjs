import { existsSync, readFileSync } from 'node:fs';

const requiredDocuments = [
  'docs/product-capsule/scope-fonctionnel.md',
  'docs/product-capsule/roadmap-shipping.md',
  'docs/operations/env-secrets-management.md',
  'docs/operations/incident-runbook.md',
  'docs/operations/go-no-go-checklist.md',
  'docs/operations/go-no-go-decision-log.md',
  'docs/operations/release-recette-report.md'
];

for (const documentPath of requiredDocuments) {
  if (!existsSync(documentPath)) {
    console.error(`Missing required release document: ${documentPath}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const packageVersion = packageJson.version;

if (!packageVersion) {
  console.error('Missing "version" field in package.json.');
  process.exit(1);
}

const manifestPath = 'artifacts/manifest.json';
if (!existsSync(manifestPath)) {
  console.log('No artifacts/manifest.json found; skipping version consistency check.');
  console.log('Release readiness checks passed.');
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestVersion = manifest.version ?? manifest.package_version ?? manifest.packageVersion;

if (manifestVersion && manifestVersion !== packageVersion) {
  console.error(
    `Version mismatch: package.json=${packageVersion} but artifacts manifest=${manifestVersion}.`
  );
  process.exit(1);
}

if (!manifestVersion) {
  console.log('Artifacts manifest does not expose a version field; version consistency check skipped.');
}

console.log('Release readiness checks passed.');
