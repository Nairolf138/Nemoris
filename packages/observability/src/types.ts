export interface StandardEvent {
  event_name: string;
  user_id: string;
  entity_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface AuditLogEntry extends StandardEvent {
  sequence: number;
}

export interface DashboardSnapshot {
  generated_at: string;
  metrics: MetricsSnapshot;
  recent_events: StandardEvent[];
}

export interface MetricsSnapshot {
  schema_version: 1;
  onboarding_completed: number;
  capsule_activity: number;
  export_total: number;
  export_rate: number;
  auth_errors: number;
  security_alerts: number;
  weekly_active_users: number;
}
