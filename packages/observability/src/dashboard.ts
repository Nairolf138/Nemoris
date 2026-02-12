import type { DashboardSnapshot, StandardEvent } from './types.js';
import type { ProductMetrics } from './metrics.js';

export const buildDashboardSnapshot = (metrics: ProductMetrics, events: StandardEvent[]): DashboardSnapshot => ({
  generated_at: new Date().toISOString(),
  metrics: metrics.snapshot(),
  recent_events: events.slice(-25),
});

export const dashboardToCsv = (snapshot: DashboardSnapshot): string => {
  const rows = [
    'metric,value',
    `onboarding_completed,${snapshot.metrics.onboarding_completed}`,
    `capsule_creations,${snapshot.metrics.capsule_creations}`,
    `exports,${snapshot.metrics.exports}`,
    `weekly_active_users,${snapshot.metrics.weekly_active_users}`,
  ];
  return rows.join('\n');
};
