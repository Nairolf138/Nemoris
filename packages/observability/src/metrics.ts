import type { MetricsSnapshot, StandardEvent } from './types.js';

export class ProductMetrics {
  private onboardingUsers = new Set<string>();
  private capsuleCreations = 0;
  private exports = 0;
  private weeklyUsers = new Set<string>();

  public ingest(event: StandardEvent): void {
    const parsed = new Date(event.timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    if (event.event_name === 'onboarding.completed') {
      this.onboardingUsers.add(event.user_id);
    }

    if (event.event_name === 'capsule.created') {
      this.capsuleCreations += 1;
    }

    if (event.event_name === 'export.created') {
      this.exports += 1;
    }

    const now = Date.now();
    const ageMs = now - parsed.getTime();
    const withinWeek = ageMs >= 0 && ageMs <= 1000 * 60 * 60 * 24 * 7;
    if (withinWeek) {
      this.weeklyUsers.add(event.user_id);
    }
  }

  public snapshot(): MetricsSnapshot {
    return {
      onboarding_completed: this.onboardingUsers.size,
      capsule_creations: this.capsuleCreations,
      exports: this.exports,
      weekly_active_users: this.weeklyUsers.size,
    };
  }
}
