import { ObservabilityService } from '../src/service.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseCsv = (csv: string): Record<string, string> => {
  const [header, ...lines] = csv.trim().split('\n');
  assert(header === 'metric,value', 'dashboard csv should include stable header');

  return lines.reduce<Record<string, string>>((acc, line) => {
    const [metric, value] = line.split(',');
    if (metric && value !== undefined) {
      acc[metric] = value;
    }
    return acc;
  }, {});
};

export const runObservabilityTests = (): void => {
  const service = new ObservabilityService();
  const now = new Date().toISOString();

  service.emit({ event_name: 'onboarding.completed', user_id: 'user-1', entity_id: 'user-1', timestamp: now });
  service.emit({ event_name: 'capsule.created', user_id: 'user-1', entity_id: 'capsule-1', timestamp: now });
  service.emit({ event_name: 'memory.created', user_id: 'user-1', entity_id: 'memory-1', timestamp: now });
  service.emit({ event_name: 'export.created', user_id: 'user-1', entity_id: 'export-1', timestamp: now });
  service.emit({ event_name: 'security.auth_failed', user_id: 'user-1', entity_id: '/auth/login', timestamp: now });
  service.emit({ event_name: 'security.alert.triggered', user_id: 'user-1', entity_id: '/auth/login', timestamp: now });
  service.emit({ event_name: 'link.created', user_id: 'user-1', entity_id: 'link-1', timestamp: now });
  service.emit({ event_name: 'retention.weekly', user_id: 'user-1', entity_id: 'retention-1', timestamp: now });
  service.emit({ event_name: 'security.auth_rejected_401', user_id: 'user-1', entity_id: '/auth/login', timestamp: now });
  service.emit({ event_name: 'security.auth_rejected_403', user_id: 'user-1', entity_id: '/capsules/cap-1', timestamp: now });
  service.emit({ event_name: 'security.auth_rate_limited_429', user_id: 'user-1', entity_id: '/auth/login', timestamp: now });
  service.emit({ event_name: 'security.session_revoked', user_id: 'user-1', entity_id: 'session-1', timestamp: now });

  const events = service.listEvents();
  assert(events.length === 12, 'should capture emitted events');

  const audit = service.listAuditLog();
  assert(audit.length === 12, 'should append immutable audit entries');
  assert(audit[0]?.sequence === 1 && audit[11]?.sequence === 12, 'audit log should be append-only sequence');

  const dashboard = service.dashboardJson();
  assert(dashboard.metrics.schema_version === 1, 'dashboard json schema version should be stable');
  assert(dashboard.metrics.onboarding_completed === 1, 'onboarding KPI should increment');
  assert(dashboard.metrics.capsule_activity === 2, 'capsule activity KPI should aggregate capsule events');
  assert(dashboard.metrics.export_total === 1, 'export total KPI should increment');
  assert(dashboard.metrics.export_rate === 0.5, 'export rate KPI should be exports/activity');
  assert(dashboard.metrics.auth_errors === 1, 'auth errors KPI should increment');
  assert(dashboard.metrics.security_alerts === 1, 'security alerts KPI should increment');
  assert(dashboard.metrics.weekly_active_users === 1, 'weekly activity should track unique users');

  const dashboardV2 = service.dashboardJsonV2();
  assert(dashboardV2.schema_version === 2, 'v2 dashboard should expose versioned schema');
  assert(dashboardV2.backward_compatible_with.includes(1), 'v2 dashboard should expose backward compatibility target');
  assert(dashboardV2.metrics.link_created_total === 1, 'link.created must be tracked in KPI metrics');
  assert(dashboardV2.metrics.retention_weekly_total === 1, 'retention.weekly must be tracked in KPI metrics');
  assert(dashboardV2.metrics.auth_rejected_401_total === 1, '401 rejects should be tracked in KPI metrics');
  assert(dashboardV2.metrics.auth_rejected_403_total === 1, '403 rejects should be tracked in KPI metrics');
  assert(dashboardV2.metrics.auth_rate_limited_429_total === 1, '429 auth rejects should be tracked in KPI metrics');
  assert(dashboardV2.metrics.session_revoked_total === 1, 'session revocations should be tracked in KPI metrics');

  const csv = service.dashboardCsv();
  const parsedCsv = parseCsv(csv);
  const expectedOrder = [
    'metric,value',
    'schema_version,1',
    'onboarding_completed,1',
    'capsule_activity,2',
    'export_total,1',
    'export_rate,0.5',
    'auth_errors,1',
    'security_alerts,1',
    'weekly_active_users,1',
  ];

  assert(csv.trim() === expectedOrder.join('\n'), 'dashboard csv format should remain stable for external consumers');
  assert(parsedCsv.schema_version === '1', 'csv should include schema_version KPI');
  assert(parsedCsv.onboarding_completed === '1', 'csv should include onboarding KPI');
  assert(parsedCsv.capsule_activity === '2', 'csv should include capsule activity KPI');
  assert(parsedCsv.export_total === '1', 'csv should include export total KPI');
  assert(parsedCsv.export_rate === '0.5', 'csv should include export rate KPI');
  assert(parsedCsv.auth_errors === '1', 'csv should include auth errors KPI');
  assert(parsedCsv.security_alerts === '1', 'csv should include security alerts KPI');

  const belowThresholdService = new ObservabilityService();
  for (let index = 0; index < 7; index += 1) {
    belowThresholdService.emit({ event_name: 'security.auth_rejected_401', user_id: 'lead-2', entity_id: '/auth/login', timestamp: now });
  }
  for (let index = 0; index < 5; index += 1) {
    belowThresholdService.emit({ event_name: 'security.auth_rejected_403', user_id: 'lead-2', entity_id: '/capsules/cap-2', timestamp: now });
  }
  for (let index = 0; index < 9; index += 1) {
    belowThresholdService.emit({ event_name: 'security.auth_rate_limited_429', user_id: 'lead-2', entity_id: '/auth/login', timestamp: now });
  }
  for (let index = 0; index < 4; index += 1) {
    belowThresholdService.emit({ event_name: 'security.session_revoked', user_id: 'lead-2', entity_id: `session-${index}`, timestamp: now });
  }

  const belowThresholdDashboard = belowThresholdService.dashboardJsonV2();
  assert(belowThresholdDashboard.alerts.find((alert) => alert.id === 'auth_rejected_401_spike')?.status === 'ok', '401 rejection alert should stay ok under threshold');
  assert(belowThresholdDashboard.alerts.find((alert) => alert.id === 'auth_rejected_403_spike')?.status === 'ok', '403 rejection alert should stay ok under threshold');
  assert(belowThresholdDashboard.alerts.find((alert) => alert.id === 'auth_rate_limited_429_spike')?.status === 'ok', '429 rejection alert should stay ok under threshold');
  assert(belowThresholdDashboard.alerts.find((alert) => alert.id === 'session_revocation_spike')?.status === 'ok', 'session revocation alert should stay ok under threshold');

  const edgeService = new ObservabilityService();
  edgeService.emit({ event_name: 'onboarding.started', user_id: 'lead-1', entity_id: '/auth/register', timestamp: now });
  edgeService.emit({ event_name: 'onboarding.started', user_id: 'lead-2', entity_id: '/auth/register', timestamp: now });
  edgeService.emit({ event_name: 'onboarding.started', user_id: 'lead-3', entity_id: '/auth/register', timestamp: now });
  edgeService.emit({ event_name: 'onboarding.started', user_id: 'lead-4', entity_id: '/auth/register', timestamp: now });
  edgeService.emit({ event_name: 'onboarding.started', user_id: 'lead-5', entity_id: '/auth/register', timestamp: now });
  edgeService.emit({ event_name: 'onboarding.completed', user_id: 'lead-1', entity_id: 'lead-1', timestamp: now });
  edgeService.emit({ event_name: 'export.failed', user_id: 'lead-1', entity_id: 'lead-1', timestamp: now });
  edgeService.emit({ event_name: 'export.failed', user_id: 'lead-1', entity_id: 'lead-1', timestamp: now });
  edgeService.emit({ event_name: 'export.created', user_id: 'lead-1', entity_id: 'export-1', timestamp: now });
  edgeService.emit({ event_name: 'export.created', user_id: 'lead-1', entity_id: 'export-2', timestamp: now });
  edgeService.emit({ event_name: 'export.failed', user_id: 'lead-1', entity_id: 'lead-1', timestamp: now });
  edgeService.emit({ event_name: 'security.auth_failed', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  edgeService.emit({ event_name: 'security.auth_failed', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  edgeService.emit({ event_name: 'security.auth_failed', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  edgeService.emit({ event_name: 'security.auth_failed', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  edgeService.emit({ event_name: 'security.auth_failed', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  for (let index = 0; index < 8; index += 1) {
    edgeService.emit({ event_name: 'security.auth_rejected_401', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  }
  for (let index = 0; index < 6; index += 1) {
    edgeService.emit({ event_name: 'security.auth_rejected_403', user_id: 'lead-1', entity_id: '/capsules/private', timestamp: now });
  }
  for (let index = 0; index < 10; index += 1) {
    edgeService.emit({ event_name: 'security.auth_rate_limited_429', user_id: 'lead-1', entity_id: '/auth/login', timestamp: now });
  }
  for (let index = 0; index < 5; index += 1) {
    edgeService.emit({ event_name: 'security.session_revoked', user_id: 'lead-1', entity_id: `session-revoked-${index}`, timestamp: now });
  }

  const edgeDashboard = edgeService.dashboardJsonV2();
  assert(edgeDashboard.metrics.export_failure_rate === 0.6, 'export failure rate should be rounded to 4 decimals');
  assert(edgeDashboard.metrics.onboarding_completion_rate === 0.2, 'onboarding completion rate should track start/completion ratio');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'export_failure_rate')?.status === 'triggered', 'export failure alert should trigger when threshold exceeded');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'auth_anomalies')?.status === 'triggered', 'auth anomaly alert should trigger at threshold');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'onboarding_drop')?.status === 'triggered', 'onboarding drop alert should trigger with low conversion and sample size');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'auth_rejected_401_spike')?.status === 'triggered', '401 rejection alert should trigger at threshold');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'auth_rejected_403_spike')?.status === 'triggered', '403 rejection alert should trigger at threshold');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'auth_rate_limited_429_spike')?.status === 'triggered', '429 rejection alert should trigger at threshold');
  assert(edgeDashboard.alerts.find((alert) => alert.id === 'session_revocation_spike')?.status === 'triggered', 'session revocation alert should trigger at threshold');
};
