import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAuthIntegrationTests } from './auth-integration.test.js';
import { runAuthServiceTests } from './auth-service.test.js';
import { runExportIntegrationTests, runExportPersistenceIntegrationTests } from './export-integration.test.js';
import { runDataIntegrationTests } from './data-integration.test.js';
import { runPersistenceIntegrationTests } from './persistence-integration.test.js';
import { runNarrativeIntegrationTests } from './narrative-integration.test.js';
import { runSecurityRegressionTests } from './security-regression.test.js';
import { runVaultIntegrationTests } from './vault-integration.test.js';
import { runDodE2EScenarios, type E2EScenarioResult } from './dod-e2e.test.js';

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const ensureEnv = (key: string, value: string): void => {
  runtimeEnv[key] = runtimeEnv[key] ?? value;
};

const bootstrapSecurityEnv = (): void => {
  ensureEnv('CAPSULE_TLS_MODE', 'terminated-by-infra');
  ensureEnv('CAPSULE_SESSION_TOKEN_SECRET', 'test-session-secret');
  ensureEnv('CAPSULE_DATA_ENCRYPTION_STRATEGY', 'aes-256-gcm');
  ensureEnv('CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS', '10');
  ensureEnv('CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS', '60000');
  ensureEnv('CAPSULE_BRUTE_FORCE_MAX_FAILURES', '3');
  ensureEnv('CAPSULE_BRUTE_FORCE_BLOCK_MS', '300000');
  ensureEnv('CAPSULE_ANOMALY_ALERT_THRESHOLD', '3');
};

const renderReleaseReport = (results: E2EScenarioResult[], candidateVersion: string): string => {
  const now = new Date().toISOString();
  const hasFailure = results.some((scenario) => scenario.status === 'fail');
  const verdict = hasFailure ? 'FAIL' : 'PASS';
  const gaps = results.filter((scenario) => scenario.status === 'fail');

  const table = results
    .map(
      (scenario) =>
        `| ${scenario.id} | ${scenario.status.toUpperCase()} | ${scenario.details} | ${scenario.deviation ?? 'Aucun'} |`,
    )
    .join('\n');

  const gapsSection =
    gaps.length === 0
      ? '- Aucun écart détecté sur les scénarios DoD/Sécurité couverts.'
      : gaps.map((gap) => `- ${gap.id}: ${gap.deviation}`).join('\n');

  return `# Rapport de recette release MVP\n\n- **Version candidate**: ${candidateVersion}\n- **Date d'exécution**: ${now}\n- **Verdict global**: **${verdict}**\n\n## Résultats scénarios E2E (DoD + sécurité minimale)\n\n| Scénario | Résultat | Détails | Écart |\n| --- | --- | --- | --- |\n${table}\n\n## Écarts avant release\n\n${gapsSection}\n\n## Source de vérité CI\n\n- Job GitHub Actions de référence: \`dod-e2e\`.\n`;
};

const writeReleaseReport = async (results: E2EScenarioResult[]): Promise<void> => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const reportPath = resolve(packageRoot, 'docs/operations/release-recette-report.md');
  await mkdir(dirname(reportPath), { recursive: true });
  const version = runtimeEnv.npm_package_version ?? '0.1.0';
  await writeFile(reportPath, renderReleaseReport(results, version), 'utf8');
  console.log(`Release recette report written: ${reportPath}`);
};

const run = async () => {
  bootstrapSecurityEnv();
  await runAuthServiceTests();
  await runAuthIntegrationTests();
  await runExportIntegrationTests();
  await runExportPersistenceIntegrationTests();
  await runDataIntegrationTests();
  await runNarrativeIntegrationTests();
  await runPersistenceIntegrationTests();
  await runSecurityRegressionTests();
  await runVaultIntegrationTests();

  const dodE2EResults = await runDodE2EScenarios();
  await writeReleaseReport(dodE2EResults);

  const failures = dodE2EResults.filter((scenario) => scenario.status === 'fail');
  if (failures.length > 0) {
    throw new Error(`DoD E2E scenarios failed: ${failures.map((failure) => failure.id).join(', ')}`);
  }

  console.log('All capsule-api tests passed.');
};

void run();
