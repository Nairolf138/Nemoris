import type { ExportFormat } from './export-service.js';
import { ValidationError } from './errors.js';
import type { RequestLike } from './types.js';

const runtimeEnv: Record<string, string | undefined> =
  ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}) as Record<string, string | undefined>;

export type PlanTier = 'free' | 'paid';
export type EntitlementFeature = 'internal_vault' | 'advanced_beneficiaries' | 'advanced_exports' | 'scheduled_messages';

export interface TierEntitlements {
  tier: PlanTier;
  features: Record<EntitlementFeature, boolean>;
  limits: {
    vaultQuotaBytes: number;
    beneficiariesMax: number;
    advancedExportFormats: ReadonlySet<ExportFormat>;
  };
}

const DEFAULT_PAID_VAULT_MB = 100;
const DEFAULT_PAID_BENEFICIARIES_MAX = 12;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const paidVaultQuotaBytes = parsePositiveInt(runtimeEnv.CAPSULE_ENTITLEMENT_PAID_VAULT_QUOTA_MB, DEFAULT_PAID_VAULT_MB) * 1024 * 1024;
const paidBeneficiariesMax = parsePositiveInt(runtimeEnv.CAPSULE_ENTITLEMENT_PAID_BENEFICIARIES_MAX, DEFAULT_PAID_BENEFICIARIES_MAX);
const defaultTier: PlanTier = runtimeEnv.CAPSULE_DEFAULT_PLAN_TIER === 'free' ? 'free' : 'paid';
const paidUsers = new Set(
  (runtimeEnv.CAPSULE_PAID_USER_IDS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0),
);

const FREE_ENTITLEMENTS: TierEntitlements = {
  tier: 'free',
  features: {
    internal_vault: false,
    advanced_beneficiaries: false,
    advanced_exports: false,
    scheduled_messages: false,
  },
  limits: {
    vaultQuotaBytes: 0,
    beneficiariesMax: 1,
    advancedExportFormats: new Set<ExportFormat>(),
  },
};

const PAID_ENTITLEMENTS: TierEntitlements = {
  tier: 'paid',
  features: {
    internal_vault: true,
    advanced_beneficiaries: true,
    advanced_exports: true,
    scheduled_messages: true,
  },
  limits: {
    vaultQuotaBytes: paidVaultQuotaBytes,
    beneficiariesMax: paidBeneficiariesMax,
    advancedExportFormats: new Set<ExportFormat>(['encrypted_zip']),
  },
};

export const getTierEntitlements = (tier: PlanTier): TierEntitlements => (tier === 'paid' ? PAID_ENTITLEMENTS : FREE_ENTITLEMENTS);

export const resolvePlanTier = (request: RequestLike, userId: string): PlanTier => {
  const headerTier = request.headers?.['x-capsule-plan'];
  if (headerTier === 'free' || headerTier === 'paid') {
    return headerTier;
  }
  if (paidUsers.size === 0) {
    return defaultTier;
  }
  return paidUsers.has(userId) ? 'paid' : 'free';
};

export const assertEntitledFeature = (entitlements: TierEntitlements, feature: EntitlementFeature): void => {
  if (!entitlements.features[feature]) {
    throw new ValidationError('DOMAIN_VALIDATION_ERROR', {
      message: `Feature "${feature}" requires a paid plan.`,
      details: { feature, required_tier: 'paid', current_tier: entitlements.tier },
    });
  }
};
