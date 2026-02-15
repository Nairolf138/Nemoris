import { ImmutableAuditLog } from './audit-log.js';
import { buildDashboardSnapshot, buildDashboardSnapshotV2, dashboardToCsv } from './dashboard.js';
import { ObservabilityEventBus } from './event-bus.js';
import { ProductMetrics } from './metrics.js';
import type { AuditLogEntry, AuditLogQuery, DashboardSnapshot, DashboardSnapshotV2, StandardEvent } from './types.js';

export interface EmitEventInput {
  event_name: string;
  user_id: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export class ObservabilityService {
  private readonly eventBus: ObservabilityEventBus;
  private readonly auditLog: ImmutableAuditLog;
  private readonly metrics: ProductMetrics;

  public constructor(
    deps: {
      eventBus?: ObservabilityEventBus;
      auditLog?: ImmutableAuditLog;
      metrics?: ProductMetrics;
    } = {},
  ) {
    this.eventBus = deps.eventBus ?? new ObservabilityEventBus();
    this.auditLog = deps.auditLog ?? new ImmutableAuditLog();
    this.metrics = deps.metrics ?? new ProductMetrics();
  }

  public emit(input: EmitEventInput): StandardEvent {
    const event: StandardEvent = {
      event_name: input.event_name,
      user_id: input.user_id,
      entity_id: input.entity_id,
      timestamp: input.timestamp ?? new Date().toISOString(),
      metadata: input.metadata ?? {},
    };
    this.eventBus.emit(event);
    this.auditLog.append(event);
    this.metrics.ingest(event);
    return event;
  }

  public listEvents(): StandardEvent[] {
    return this.eventBus.listEvents();
  }

  public listAuditLog(query?: AuditLogQuery): AuditLogEntry[] {
    return this.auditLog.list(query);
  }

  public dashboardJson(): DashboardSnapshot {
    return buildDashboardSnapshot(this.metrics, this.eventBus.listEvents());
  }

  public dashboardCsv(): string {
    return dashboardToCsv(this.dashboardJson());
  }

  public dashboardJsonV2(): DashboardSnapshotV2 {
    return buildDashboardSnapshotV2(this.metrics, this.eventBus.listEvents());
  }
}
