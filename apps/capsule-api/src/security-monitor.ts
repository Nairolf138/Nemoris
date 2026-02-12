import { ObservabilityService } from '@capsule/observability';

export class SecurityMonitor {
  private readonly anomalyCounters = new Map<string, number>();

  public constructor(
    private readonly observability: ObservabilityService,
    private readonly alertThreshold: number,
  ) {}

  public logDeniedAccess(userId: string, path: string, reason: string): void {
    this.observability.emit({
      event_name: 'security.access_denied',
      user_id: userId,
      entity_id: path,
      metadata: { reason },
    });
    this.trackAnomaly(`denied:${userId}:${path}`, userId, path, reason);
  }

  public logFailedAuth(actor: string, path: string, reason: string): void {
    this.observability.emit({
      event_name: 'security.auth_failed',
      user_id: actor,
      entity_id: path,
      metadata: { reason },
    });
    this.trackAnomaly(`auth-fail:${actor}:${path}`, actor, path, reason);
  }

  private trackAnomaly(key: string, actor: string, path: string, reason: string): void {
    const nextCount = (this.anomalyCounters.get(key) ?? 0) + 1;
    this.anomalyCounters.set(key, nextCount);

    if (nextCount >= this.alertThreshold) {
      this.observability.emit({
        event_name: 'security.alert.triggered',
        user_id: actor,
        entity_id: path,
        metadata: { reason, attempts: nextCount },
      });
      console.warn(`[SECURITY_ALERT] actor=${actor} path=${path} reason=${reason} attempts=${nextCount}`);
      this.anomalyCounters.set(key, 0);
    }
  }
}
