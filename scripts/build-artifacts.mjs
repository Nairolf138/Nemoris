import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const artifactsDir = 'artifacts';
const buildDir = `${artifactsDir}/build`;
const targets = [
  'apps/capsule-api',
  'apps/capsule',
  'packages/core',
  'packages/export',
  'packages/observability',
  'packages/ui'
];

rmSync(artifactsDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

const createdAt = new Date().toISOString();
const commitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

const files = [];
for (const target of targets) {
  const safeName = target.replaceAll('/', '-');
  const output = `${buildDir}/${safeName}.tgz`;
  execSync(`tar -czf ${output} ${target}`, { stdio: 'inherit' });
  files.push({ target, file: output });
}

const manifest = {
  created_at: createdAt,
  commit_sha: commitSha,
  files
};

writeFileSync(`${artifactsDir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Artifacts generated in ${artifactsDir}/`);
