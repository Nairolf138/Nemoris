import { runAuthIntegrationTests } from './auth-integration.test.js';
import { runAuthServiceTests } from './auth-service.test.js';
import { runExportIntegrationTests } from './export-integration.test.js';

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const ensureEnv = (key: string, value: string): void => {
  runtimeEnv[key] = runtimeEnv[key] ?? value;
};

const bootstrapSecurityEnv = (): void => {
  ensureEnv('CAPSULE_TLS_MODE', 'terminated-by-infra');
  ensureEnv('CAPSULE_SESSION_TOKEN_SECRET', 'test-session-secret');
  ensureEnv('CAPSULE_DATA_ENCRYPTION_STRATEGY', 'AES-256 envelope encryption managed by infra KMS');
  ensureEnv('CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS', '10');
  ensureEnv('CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS', '60000');
  ensureEnv('CAPSULE_BRUTE_FORCE_MAX_FAILURES', '3');
  ensureEnv('CAPSULE_BRUTE_FORCE_BLOCK_MS', '300000');
  ensureEnv('CAPSULE_ANOMALY_ALERT_THRESHOLD', '3');
};

const run = async () => {
  bootstrapSecurityEnv();
  await runAuthServiceTests();
  await runAuthIntegrationTests();
  await runExportIntegrationTests();
  console.log('All capsule-api tests passed.');
};

void run();
