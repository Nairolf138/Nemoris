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

  const events = service.listEvents();
  assert(events.length === 6, 'should capture emitted events');

  const audit = service.listAuditLog();
  assert(audit.length === 6, 'should append immutable audit entries');
  assert(audit[0]?.sequence === 1 && audit[5]?.sequence === 6, 'audit log should be append-only sequence');

  const dashboard = service.dashboardJson();
  assert(dashboard.metrics.schema_version === 1, 'dashboard json schema version should be stable');
  assert(dashboard.metrics.onboarding_completed === 1, 'onboarding KPI should increment');
  assert(dashboard.metrics.capsule_activity === 2, 'capsule activity KPI should aggregate capsule events');
  assert(dashboard.metrics.export_total === 1, 'export total KPI should increment');
  assert(dashboard.metrics.export_rate === 0.5, 'export rate KPI should be exports/activity');
  assert(dashboard.metrics.auth_errors === 1, 'auth errors KPI should increment');
  assert(dashboard.metrics.security_alerts === 1, 'security alerts KPI should increment');
  assert(dashboard.metrics.weekly_active_users === 1, 'weekly activity should track unique users');

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
};
