import { ObservabilityService } from '../src/service.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runObservabilityTests = (): void => {
  const service = new ObservabilityService();
  const now = new Date().toISOString();

  service.emit({ event_name: 'onboarding.completed', user_id: 'user-1', entity_id: 'user-1', timestamp: now });
  service.emit({ event_name: 'capsule.created', user_id: 'user-1', entity_id: 'capsule-1', timestamp: now });
  service.emit({ event_name: 'export.created', user_id: 'user-1', entity_id: 'export-1', timestamp: now });

  const events = service.listEvents();
  assert(events.length === 3, 'should capture emitted events');

  const audit = service.listAuditLog();
  assert(audit.length === 3, 'should append immutable audit entries');
  assert(audit[0]?.sequence === 1 && audit[2]?.sequence === 3, 'audit log should be append-only sequence');

  const dashboard = service.dashboardJson();
  assert(dashboard.metrics.onboarding_completed === 1, 'onboarding metric should increment');
  assert(dashboard.metrics.capsule_creations === 1, 'capsule metric should increment');
  assert(dashboard.metrics.exports === 1, 'export metric should increment');
  assert(dashboard.metrics.weekly_active_users === 1, 'weekly activity should track unique users');

  const csv = service.dashboardCsv();
  assert(csv.includes('metric,value'), 'dashboard csv should include header');
};
