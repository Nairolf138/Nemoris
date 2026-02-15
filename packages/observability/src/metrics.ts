import type { MetricsSnapshot, MetricsSnapshotV2, StandardEvent } from './types.js';

const CAPSULE_ACTIVITY_EVENTS = new Set<string>([
  'capsule.created',
  'capsule.updated',
  'capsule.deleted',
  'memory.created',
  'memory.updated',
  'memory.deleted',
  'belief.created',
  'belief.updated',
  'belief.deleted',
  'lesson.created',
  'lesson.updated',
  'lesson.deleted',
  'value_profile.created',
  'value_profile.updated',
  'value_profile.deleted',
  'legacy_message.created',
  'legacy_message.updated',
  'legacy_message.deleted',
]);

const ENTRY_CREATED_EVENTS = new Set<string>(['memory.created', 'belief.created', 'lesson.created', 'value_profile.created']);
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

interface RollingEvent {
  timestampMs: number;
  userId: string;
  entryCreated: boolean;
}

const readExportFormat = (event: StandardEvent): 'pdf' | 'json' | 'unknown' => {
  const format = event.metadata.format;
  if (typeof format !== 'string') {
    return 'unknown';
  }
  if (format === 'pdf' || format === 'json') {
    return format;
  }
  return 'unknown';
};

export class ProductMetrics {
  private onboardingUsers = new Set<string>();
  private onboardingStarted = 0;
  private onboardingCompletedTotal = 0;
  private capsuleActivity = 0;
  private entriesCreatedTotal = 0;
  private exports = 0;
  private exportFailures = 0;
  private exportAttempts = 0;
  private exportPdfSuccess = 0;
  private exportJsonSuccess = 0;
  private exportPdfAttempts = 0;
  private exportJsonAttempts = 0;
  private weeklyUsers = new Set<string>();
  private retentionWeeklyUsers = new Set<string>();
  private linksCreated = 0;
  private authErrors = 0;
  private securityAlerts = 0;
  private authRejected401 = 0;
  private authRejected403 = 0;
  private authRateLimited429 = 0;
  private revokedSessions = 0;
  private conversionTierFreeAssigned = 0;
  private conversionTierPaidAssigned = 0;
  private conversionUpgradePrompted = 0;
  private conversionPaidFeatureUsage = 0;
  private conversionUpgradeActivatedUsers = new Set<string>();
  private conversionPromptedUsers = new Set<string>();
  private rolling30dEvents: RollingEvent[] = [];

  public ingest(event: StandardEvent): void {
    const parsed = new Date(event.timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    const eventTimestampMs = parsed.getTime();

    if (event.event_name === 'onboarding.started') {
      this.onboardingStarted += 1;
    }

    if (event.event_name === 'onboarding.completed') {
      this.onboardingUsers.add(event.user_id);
      this.onboardingCompletedTotal += 1;
    }

    if (CAPSULE_ACTIVITY_EVENTS.has(event.event_name)) {
      this.capsuleActivity += 1;
    }

    const entryCreated = ENTRY_CREATED_EVENTS.has(event.event_name);
    if (entryCreated) {
      this.entriesCreatedTotal += 1;
    }

    if (event.event_name === 'export.created') {
      this.exports += 1;
      this.exportAttempts += 1;
      const format = readExportFormat(event);
      if (format === 'pdf') {
        this.exportPdfSuccess += 1;
        this.exportPdfAttempts += 1;
      }
      if (format === 'json') {
        this.exportJsonSuccess += 1;
        this.exportJsonAttempts += 1;
      }
    }

    if (event.event_name === 'export.failed') {
      this.exportFailures += 1;
      this.exportAttempts += 1;
      const format = readExportFormat(event);
      if (format === 'pdf') {
        this.exportPdfAttempts += 1;
      }
      if (format === 'json') {
        this.exportJsonAttempts += 1;
      }
    }

    if (event.event_name === 'link.created') {
      this.linksCreated += 1;
    }

    if (event.event_name === 'retention.weekly') {
      this.retentionWeeklyUsers.add(event.user_id);
    }

    if (event.event_name === 'security.auth_failed') {
      this.authErrors += 1;
    }

    if (event.event_name === 'security.alert.triggered') {
      this.securityAlerts += 1;
    }

    if (event.event_name === 'security.auth_rejected_401') {
      this.authRejected401 += 1;
    }

    if (event.event_name === 'security.auth_rejected_403') {
      this.authRejected403 += 1;
    }

    if (event.event_name === 'security.auth_rate_limited_429') {
      this.authRateLimited429 += 1;
    }

    if (event.event_name === 'security.session_revoked') {
      this.revokedSessions += 1;
    }

    if (event.event_name === 'conversion.tier.assigned') {
      const tier = event.metadata.tier;
      if (tier === 'free') {
        this.conversionTierFreeAssigned += 1;
      }
      if (tier === 'paid') {
        this.conversionTierPaidAssigned += 1;
      }
    }

    if (event.event_name === 'conversion.tier.upgrade_prompted') {
      this.conversionUpgradePrompted += 1;
      this.conversionPromptedUsers.add(event.user_id);
    }

    if (event.event_name === 'conversion.tier.feature_used') {
      const tier = event.metadata.tier;
      if (tier === 'paid') {
        this.conversionPaidFeatureUsage += 1;
      }
      if (tier === 'paid' && this.conversionPromptedUsers.has(event.user_id)) {
        this.conversionUpgradeActivatedUsers.add(event.user_id);
      }
    }

    const now = Date.now();
    const ageMs = now - eventTimestampMs;
    const withinWeek = ageMs >= 0 && ageMs <= 1000 * 60 * 60 * 24 * 7;
    if (withinWeek) {
      this.weeklyUsers.add(event.user_id);
    }

    this.rolling30dEvents.push({ timestampMs: eventTimestampMs, userId: event.user_id, entryCreated });
    this.pruneRolling30d(now);
  }

  public snapshot(): MetricsSnapshot {
    const exportRate = this.capsuleActivity === 0 ? 0 : Number((this.exports / this.capsuleActivity).toFixed(4));

    return {
      schema_version: 1,
      onboarding_completed: this.onboardingUsers.size,
      capsule_activity: this.capsuleActivity,
      export_total: this.exports,
      export_rate: exportRate,
      auth_errors: this.authErrors,
      security_alerts: this.securityAlerts,
      weekly_active_users: this.weeklyUsers.size,
    };
  }

  public snapshotV2(): MetricsSnapshotV2 {
    const legacy = this.snapshot();
    const completionRate = this.onboardingStarted === 0 ? 0 : Number((this.onboardingCompletedTotal / this.onboardingStarted).toFixed(4));
    const exportFailureRate = this.exportAttempts === 0 ? 0 : Number((this.exportFailures / this.exportAttempts).toFixed(4));
    const exportSuccessRate = this.exportAttempts === 0 ? 0 : Number((this.exports / this.exportAttempts).toFixed(4));
    const exportPdfSuccessRate = this.exportPdfAttempts === 0 ? 0 : Number((this.exportPdfSuccess / this.exportPdfAttempts).toFixed(4));
    const exportJsonSuccessRate = this.exportJsonAttempts === 0 ? 0 : Number((this.exportJsonSuccess / this.exportJsonAttempts).toFixed(4));
    const linkCreationRate = this.entriesCreatedTotal === 0 ? 0 : Number((this.linksCreated / this.entriesCreatedTotal).toFixed(4));
    const activeUsers30d = new Set(this.rolling30dEvents.map((event) => event.userId)).size;
    const entries30dTotal = this.rolling30dEvents.reduce((total, event) => total + (event.entryCreated ? 1 : 0), 0);
    const entriesPerActiveUser30d = activeUsers30d === 0 ? 0 : Number((entries30dTotal / activeUsers30d).toFixed(4));
    const retentionJ7Rate =
      this.onboardingUsers.size === 0 ? 0 : Number((this.retentionWeeklyUsers.size / this.onboardingUsers.size).toFixed(4));

    return {
      ...legacy,
      onboarding_started_total: this.onboardingStarted,
      onboarding_completion_rate: completionRate,
      entries_created_total: this.entriesCreatedTotal,
      entries_per_active_user_30d: entriesPerActiveUser30d,
      export_failure_total: this.exportFailures,
      export_failure_rate: exportFailureRate,
      export_success_rate: exportSuccessRate,
      export_pdf_success_total: this.exportPdfSuccess,
      export_json_success_total: this.exportJsonSuccess,
      export_pdf_success_rate: exportPdfSuccessRate,
      export_json_success_rate: exportJsonSuccessRate,
      link_created_total: this.linksCreated,
      link_creation_rate: linkCreationRate,
      retention_weekly_total: this.retentionWeeklyUsers.size,
      retention_j7_rate: retentionJ7Rate,
      auth_rejected_401_total: this.authRejected401,
      auth_rejected_403_total: this.authRejected403,
      auth_rate_limited_429_total: this.authRateLimited429,
      session_revoked_total: this.revokedSessions,
      conversion_tier_free_assigned_total: this.conversionTierFreeAssigned,
      conversion_tier_paid_assigned_total: this.conversionTierPaidAssigned,
      conversion_upgrade_prompted_total: this.conversionUpgradePrompted,
      conversion_paid_feature_usage_total: this.conversionPaidFeatureUsage,
      conversion_upgrade_activated_total: this.conversionUpgradeActivatedUsers.size,
    };
  }

  private pruneRolling30d(nowMs: number): void {
    const threshold = nowMs - THIRTY_DAYS_MS;
    this.rolling30dEvents = this.rolling30dEvents.filter((event) => event.timestampMs >= threshold && event.timestampMs <= nowMs);
  }
}
