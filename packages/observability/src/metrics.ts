import type { MetricsSnapshot, StandardEvent } from './types.js';

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

export class ProductMetrics {
  private onboardingUsers = new Set<string>();
  private capsuleActivity = 0;
  private exports = 0;
  private weeklyUsers = new Set<string>();
  private authErrors = 0;
  private securityAlerts = 0;

  public ingest(event: StandardEvent): void {
    const parsed = new Date(event.timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    if (event.event_name === 'onboarding.completed') {
      this.onboardingUsers.add(event.user_id);
    }

    if (CAPSULE_ACTIVITY_EVENTS.has(event.event_name)) {
      this.capsuleActivity += 1;
    }

    if (event.event_name === 'export.created') {
      this.exports += 1;
    }

    if (event.event_name === 'security.auth_failed') {
      this.authErrors += 1;
    }

    if (event.event_name === 'security.alert.triggered') {
      this.securityAlerts += 1;
    }

    const now = Date.now();
    const ageMs = now - parsed.getTime();
    const withinWeek = ageMs >= 0 && ageMs <= 1000 * 60 * 60 * 24 * 7;
    if (withinWeek) {
      this.weeklyUsers.add(event.user_id);
    }
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
}
