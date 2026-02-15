export interface SecurityConfig {
  sessionTokenSecret: string;
  dataEncryptionStrategy: string;
  tlsMode: 'required' | 'terminated-by-infra';
  authRateLimitMaxAttempts: number;
  authRateLimitWindowMs: number;
  bruteForceMaxFailures: number;
  bruteForceBlockMs: number;
  anomalyAlertThreshold: number;
  recoverySensitiveActionDelayMs: number;
}

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  (globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {};

const parsePositiveInt = (value: string | undefined, key: string): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`INVALID_ENV_${key}`);
  }
  return parsed;
};



const parseOptionalPositiveInt = (value: string | undefined, fallback: number, key: string): number => {
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return parsePositiveInt(value, key);
};
const getRequiredEnv = (key: string): string => {
  const value = runtimeEnv[key]?.trim();
  if (!value) {
    throw new Error(`MISSING_ENV_${key}`);
  }
  return value;
};

export const loadSecurityConfig = (): SecurityConfig => {
  const tlsMode = getRequiredEnv('CAPSULE_TLS_MODE');
  if (tlsMode !== 'required' && tlsMode !== 'terminated-by-infra') {
    throw new Error('INVALID_ENV_CAPSULE_TLS_MODE');
  }

  return {
    sessionTokenSecret: getRequiredEnv('CAPSULE_SESSION_TOKEN_SECRET'),
    dataEncryptionStrategy: getRequiredEnv('CAPSULE_DATA_ENCRYPTION_STRATEGY'),
    tlsMode,
    authRateLimitMaxAttempts: parsePositiveInt(runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS, 'CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS'),
    authRateLimitWindowMs: parsePositiveInt(runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS, 'CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS'),
    bruteForceMaxFailures: parsePositiveInt(runtimeEnv.CAPSULE_BRUTE_FORCE_MAX_FAILURES, 'CAPSULE_BRUTE_FORCE_MAX_FAILURES'),
    bruteForceBlockMs: parsePositiveInt(runtimeEnv.CAPSULE_BRUTE_FORCE_BLOCK_MS, 'CAPSULE_BRUTE_FORCE_BLOCK_MS'),
    anomalyAlertThreshold: parsePositiveInt(runtimeEnv.CAPSULE_ANOMALY_ALERT_THRESHOLD, 'CAPSULE_ANOMALY_ALERT_THRESHOLD'),
    recoverySensitiveActionDelayMs: parseOptionalPositiveInt(
      runtimeEnv.CAPSULE_RECOVERY_SENSITIVE_ACTION_DELAY_MS,
      1000 * 60 * 30,
      'CAPSULE_RECOVERY_SENSITIVE_ACTION_DELAY_MS',
    ),
  };
};
