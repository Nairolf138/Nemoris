import { ObservabilityService } from '@capsule/observability';

const latencyBucket = (durationMs: number): string => {
  if (durationMs < 100) return 'lt_100ms';
  if (durationMs < 300) return '100_299ms';
  if (durationMs < 1000) return '300_999ms';
  return 'gte_1000ms';
};

export class SecurityMonitor {
  private readonly anomalyCounters = new Map<string, number>();

  public constructor(
    private readonly observability: ObservabilityService,
    private readonly alertThreshold: number,
  ) {}

  public logDeniedAccess(userId: string, path: string, reason: string, durationMs = 0): void {
    this.observability.emit({
      event_name: 'security.access_denied',
      user_id: userId,
      entity_id: path,
      metadata: {
        actor_type: 'user',
        route: path,
        outcome: 'denied',
        latency_bucket: latencyBucket(durationMs),
        reason,
      },
    });
    this.trackAnomaly(`denied:${userId}:${path}`, userId, path, reason, durationMs);
  }

  public logFailedAuth(actor: string, path: string, reason: string, durationMs = 0): void {
    this.observability.emit({
      event_name: 'security.auth_failed',
      user_id: actor,
      entity_id: path,
      metadata: {
        actor_type: 'user',
        route: path,
        outcome: 'failure',
        latency_bucket: latencyBucket(durationMs),
        reason,
      },
    });
    this.trackAnomaly(`auth-fail:${actor}:${path}`, actor, path, reason, durationMs);
  }

  public logAuthRejected(actor: string, path: string, statusCode: 401 | 403, reason: string, durationMs = 0): void {
    this.observability.emit({
      event_name: statusCode === 401 ? 'security.auth_rejected_401' : 'security.auth_rejected_403',
      user_id: actor,
      entity_id: path,
      metadata: {
        actor_type: 'user',
        route: path,
        outcome: 'denied',
        latency_bucket: latencyBucket(durationMs),
        reason,
        status_code: statusCode,
      },
    });
    this.trackAnomaly(`auth-rejected:${statusCode}:${actor}:${path}`, actor, path, reason, durationMs);
  }

  public logAuthRateLimited(actor: string, path: string, reason: string, durationMs = 0): void {
    this.observability.emit({
      event_name: 'security.auth_rate_limited_429',
      user_id: actor,
      entity_id: path,
      metadata: {
        actor_type: 'user',
        route: path,
        outcome: 'rate_limited',
        latency_bucket: latencyBucket(durationMs),
        reason,
        status_code: 429,
      },
    });
    this.trackAnomaly(`auth-rate-limited:${actor}:${path}`, actor, path, reason, durationMs);
  }

  public logSessionRevoked(actor: string, sessionId: string, reason: string): void {
    this.observability.emit({
      event_name: 'security.session_revoked',
      user_id: actor,
      entity_id: sessionId,
      metadata: {
        actor_type: 'system',
        route: 'session',
        outcome: 'revoked',
        reason,
      },
    });
  }

  private trackAnomaly(key: string, actor: string, path: string, reason: string, durationMs: number): void {
    const nextCount = (this.anomalyCounters.get(key) ?? 0) + 1;
    this.anomalyCounters.set(key, nextCount);

    if (nextCount >= this.alertThreshold) {
      this.observability.emit({
        event_name: 'security.alert.triggered',
        user_id: actor,
        entity_id: path,
        metadata: {
          actor_type: 'system',
          route: path,
          outcome: 'alert',
          latency_bucket: latencyBucket(durationMs),
          reason,
          attempts: nextCount,
        },
      });
      console.warn(`[SECURITY_ALERT] actor=${actor} path=${path} reason=${reason} attempts=${nextCount}`);
      this.anomalyCounters.set(key, 0);
    }
  }
}
