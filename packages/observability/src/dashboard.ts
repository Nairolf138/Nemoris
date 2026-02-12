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
    `schema_version,${snapshot.metrics.schema_version}`,
    `onboarding_completed,${snapshot.metrics.onboarding_completed}`,
    `capsule_activity,${snapshot.metrics.capsule_activity}`,
    `export_total,${snapshot.metrics.export_total}`,
    `export_rate,${snapshot.metrics.export_rate}`,
    `auth_errors,${snapshot.metrics.auth_errors}`,
    `security_alerts,${snapshot.metrics.security_alerts}`,
    `weekly_active_users,${snapshot.metrics.weekly_active_users}`,
  ];
  return rows.join('\n');
};
