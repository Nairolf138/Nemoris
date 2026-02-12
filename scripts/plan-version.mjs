import { readFileSync } from 'node:fs';

const bumpType = process.argv[2] ?? 'patch';
const allowed = new Set(['major', 'minor', 'patch']);

if (!allowed.has(bumpType)) {
  console.error('Usage: node scripts/plan-version.mjs [major|minor|patch]');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const current = pkg.version;
const [major, minor, patch] = current.split('.').map(Number);

if ([major, minor, patch].some(Number.isNaN)) {
  console.error(`Invalid semver version in package.json: ${current}`);
  process.exit(1);
}

const next = {
  major: `${major + 1}.0.0`,
  minor: `${major}.${minor + 1}.0`,
  patch: `${major}.${minor}.${patch + 1}`
}[bumpType];

const releasePlan = {
  strategy: 'semver',
  current_version: current,
  bump: bumpType,
  next_version: next,
  tagging: `v${next}`,
  notes: [
    'major: breaking changes contract/API',
    'minor: backward-compatible features',
    'patch: fixes/internal updates'
  ]
};

console.log(JSON.stringify(releasePlan, null, 2));
