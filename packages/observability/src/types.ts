export interface StandardEvent {
  event_name: string;
  user_id: string;
  entity_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface AuditLogEntry extends StandardEvent {
  sequence: number;
  actor: string;
  action: string;
  target: string;
  result: string;
}

export interface AuditLogQuery {
  limit?: number;
  actor?: string;
  action?: string;
  target?: string;
  result?: string;
}

export interface DashboardSnapshot {
  generated_at: string;
  metrics: MetricsSnapshot;
  recent_events: StandardEvent[];
}

export interface DashboardAlert {
  id:
    | 'export_failure_rate'
    | 'auth_anomalies'
    | 'onboarding_drop'
    | 'auth_rejected_401_spike'
    | 'auth_rejected_403_spike'
    | 'auth_rate_limited_429_spike'
    | 'session_revocation_spike';
  status: 'ok' | 'triggered';
  severity: 'warning' | 'critical';
  message: string;
}

export interface DashboardSnapshotV2 {
  schema_version: 2;
  backward_compatible_with: [1];
  generated_at: string;
  metrics: MetricsSnapshotV2;
  recent_events: StandardEvent[];
  alerts: DashboardAlert[];
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

export interface MetricsSnapshotV2 extends MetricsSnapshot {
  onboarding_started_total: number;
  onboarding_completion_rate: number;
  entries_created_total: number;
  entries_per_active_user_30d: number;
  export_failure_total: number;
  export_failure_rate: number;
  export_success_rate: number;
  export_pdf_success_total: number;
  export_json_success_total: number;
  export_pdf_success_rate: number;
  export_json_success_rate: number;
  link_created_total: number;
  link_creation_rate: number;
  retention_weekly_total: number;
  retention_j7_rate: number;
  auth_rejected_401_total: number;
  auth_rejected_403_total: number;
  auth_rate_limited_429_total: number;
  session_revoked_total: number;
  conversion_tier_free_assigned_total: number;
  conversion_tier_paid_assigned_total: number;
  conversion_upgrade_prompted_total: number;
  conversion_paid_feature_usage_total: number;
  conversion_upgrade_activated_total: number;
}
