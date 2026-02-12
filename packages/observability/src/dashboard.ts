import type { DashboardAlert, DashboardSnapshot, DashboardSnapshotV2, StandardEvent } from './types.js';
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

const EXPORT_FAILURE_RATE_THRESHOLD = 0.2;
const AUTH_ANOMALIES_THRESHOLD = 5;
const ONBOARDING_DROP_THRESHOLD = 0.6;
const MIN_SAMPLE_SIZE = 5;

export const buildDashboardSnapshotV2 = (metrics: ProductMetrics, events: StandardEvent[]): DashboardSnapshotV2 => {
  const metricsV2 = metrics.snapshotV2();
  const alerts: DashboardAlert[] = [
    {
      id: 'export_failure_rate',
      status:
        metricsV2.export_failure_rate >= EXPORT_FAILURE_RATE_THRESHOLD &&
        metricsV2.export_total + metricsV2.export_failure_total >= MIN_SAMPLE_SIZE
          ? 'triggered'
          : 'ok',
      severity: 'critical',
      message: `Export failure rate=${metricsV2.export_failure_rate} (threshold=${EXPORT_FAILURE_RATE_THRESHOLD})`,
    },
    {
      id: 'auth_anomalies',
      status: metricsV2.auth_errors >= AUTH_ANOMALIES_THRESHOLD ? 'triggered' : 'ok',
      severity: 'warning',
      message: `Auth anomalies=${metricsV2.auth_errors} (threshold=${AUTH_ANOMALIES_THRESHOLD})`,
    },
    {
      id: 'onboarding_drop',
      status:
        metricsV2.onboarding_started_total >= MIN_SAMPLE_SIZE && metricsV2.onboarding_completion_rate < ONBOARDING_DROP_THRESHOLD
          ? 'triggered'
          : 'ok',
      severity: 'warning',
      message: `Onboarding completion rate=${metricsV2.onboarding_completion_rate} (threshold=${ONBOARDING_DROP_THRESHOLD})`,
    },
  ];

  return {
    schema_version: 2,
    backward_compatible_with: [1],
    generated_at: new Date().toISOString(),
    metrics: metricsV2,
    recent_events: events.slice(-25),
    alerts,
  };
};
