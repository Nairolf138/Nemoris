import type { ResponseLike, RequestLike } from './types.js';
import { AuthService } from './auth-service.js';
import { ExportService, type ExportFormat } from './export-service.js';
import { ObservabilityService } from '@capsule/observability';
import { loadSecurityConfig } from './security-config.js';
import { SlidingWindowRateLimiter } from './rate-limiter.js';
import { SecurityMonitor } from './security-monitor.js';

interface Credentials {
  email: string;
  password: string;
}

const parseBearer = (authorization?: string): string | undefined => {
  if (!authorization) {
    return undefined;
  }
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return undefined;
  }
  return token;
};

const parseCredentials = (body: unknown): Credentials => {
  const payload = body as Partial<Credentials>;
  if (!payload?.email || !payload?.password) {
    throw new Error('INVALID_PAYLOAD');
  }
  return { email: payload.email, password: payload.password };
};

const parseExportFormat = (body: unknown): ExportFormat => {
  const payload = body as { format?: ExportFormat } | undefined;
  if (!payload?.format) {
    return 'json';
  }
  if (payload.format !== 'json' && payload.format !== 'pdf') {
    throw new Error('INVALID_PAYLOAD');
  }
  return payload.format;
};

const parseRequestedOwner = (request: RequestLike): string | undefined => {
  const ownerFromHeader = request.headers?.['x-owner-id'];
  if (ownerFromHeader) {
    return ownerFromHeader;
  }

  const payload = request.body as { owner_id?: string } | undefined;
  if (payload?.owner_id) {
    return payload.owner_id;
  }

  const [, queryString] = request.path.split('?');
  if (!queryString) {
    return undefined;
  }

  const params = new URLSearchParams(queryString);
  return params.get('owner_id') ?? undefined;
};

const parseClientFingerprint = (request: RequestLike): string => {
  const ip = request.headers?.['x-forwarded-for']?.split(',')[0]?.trim();
  return ip || request.headers?.['x-client-id'] || 'unknown-client';
};

export class CapsuleApiApp {
  private authService = new AuthService();
  private exportService = new ExportService();
  private observability = new ObservabilityService();
  private readonly securityConfig = loadSecurityConfig();
  private readonly authRateLimiter = new SlidingWindowRateLimiter(
    this.securityConfig.authRateLimitMaxAttempts,
    this.securityConfig.authRateLimitWindowMs,
    this.securityConfig.authRateLimitWindowMs,
  );
  private readonly bruteForceLimiter = new SlidingWindowRateLimiter(
    this.securityConfig.bruteForceMaxFailures,
    this.securityConfig.authRateLimitWindowMs,
    this.securityConfig.bruteForceBlockMs,
  );
  private readonly securityMonitor = new SecurityMonitor(this.observability, this.securityConfig.anomalyAlertThreshold);

  public async handle(request: RequestLike): Promise<ResponseLike> {
    try {
      if (request.method === 'POST' && request.path === '/auth/register') {
        this.enforceAuthRateLimits(request);
        const creds = parseCredentials(request.body);
        const auth = await this.authService.register(creds.email, creds.password);
        this.observability.emit({
          event_name: 'onboarding.completed',
          user_id: auth.user.id,
          entity_id: auth.user.id,
          metadata: { email: auth.user.email },
        });
        return { status: 201, body: auth };
      }

      if (request.method === 'POST' && request.path === '/auth/login') {
        this.enforceAuthRateLimits(request);
        const creds = parseCredentials(request.body);
        const bruteForceKey = `${parseClientFingerprint(request)}:${creds.email}`;
        const bruteForceStatus = this.bruteForceLimiter.check(bruteForceKey);
        if (!bruteForceStatus.allowed) {
          this.securityMonitor.logFailedAuth(creds.email, request.path, 'BRUTE_FORCE_BLOCKED');
          return { status: 429, body: { error: 'RATE_LIMITED', retry_after_ms: bruteForceStatus.retryAfterMs } };
        }

        const auth = await this.authService.login(creds.email, creds.password);
        this.observability.emit({
          event_name: 'auth.login',
          user_id: auth.user.id,
          entity_id: auth.session.token,
          metadata: {},
        });
        return { status: 200, body: auth };
      }

      if (request.method === 'POST' && request.path === '/auth/logout') {
        this.enforceAuthRateLimits(request);
        const token = parseBearer(request.headers?.authorization);
        if (!token) {
          return { status: 401, body: { error: 'UNAUTHENTICATED' } };
        }
        const auth = this.authService.authenticate(token);
        this.authService.logout(token);
        this.observability.emit({
          event_name: 'auth.logout',
          user_id: auth.user.id,
          entity_id: token,
          metadata: {},
        });
        return { status: 204, body: null };
      }

      if (request.method === 'POST' && request.path === '/auth/refresh') {
        this.enforceAuthRateLimits(request);
        const token = parseBearer(request.headers?.authorization);
        if (!token) {
          return { status: 401, body: { error: 'UNAUTHENTICATED' } };
        }
        const auth = this.authService.authenticate(token);
        const session = this.authService.refresh(token);
        this.observability.emit({
          event_name: 'auth.refresh',
          user_id: auth.user.id,
          entity_id: session.token,
          metadata: { previous_session: token },
        });
        return { status: 200, body: { session } };
      }

      if (request.method === 'POST' && request.path === '/exports') {
        return this.generateExport(request);
      }

      if (request.method === 'GET' && request.path.startsWith('/exports/') && request.path.endsWith('/download')) {
        return this.downloadExport(request);
      }

      if (request.method === 'GET' && request.path === '/exports/audit') {
        return this.listExportAuditLogs(request);
      }

      if (request.method === 'GET' && request.path === '/observability/audit') {
        return this.getObservabilityAuditLog(request);
      }

      if (request.method === 'GET' && request.path === '/observability/dashboard') {
        return this.getDashboard(request);
      }

      if (request.path.startsWith('/data/')) {
        return this.protectDataRoute(request);
      }

      return { status: 404, body: { error: 'NOT_FOUND' } };
    } catch (error) {
      this.trackSecurityFailure(request, error);
      return this.mapError(error);
    }
  }

  private enforceAuthRateLimits(request: RequestLike): void {
    const key = `${parseClientFingerprint(request)}:${request.path}`;
    const status = this.authRateLimiter.check(key);
    if (!status.allowed) {
      throw new Error('RATE_LIMITED');
    }
  }

  private enforceOwnerAccess(request: RequestLike, userId: string): void {
    const requestedOwner = parseRequestedOwner(request);
    if (!requestedOwner) {
      throw new Error('OWNER_SCOPE_REQUIRED');
    }
    if (requestedOwner !== userId) {
      throw new Error('FORBIDDEN');
    }
  }

  private protectDataRoute(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    return {
      status: 200,
      body: {
        message: `Accès autorisé à ${request.path}`,
      },
    };
  }

  private async generateExport(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    const format = parseExportFormat(request.body);
    const generated = await this.exportService.createExport(auth.user.id, auth.user.id, format);
    this.observability.emit({
      event_name: 'export.created',
      user_id: auth.user.id,
      entity_id: generated.id,
      metadata: { format: generated.format },
    });

    return {
      status: 201,
      body: {
        export_id: generated.id,
        format: generated.format,
        created_at: generated.created_at,
        download_url: `/exports/${generated.id}/download`,
      },
    };
  }

  private downloadExport(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    const exportId = request.path.replace('/exports/', '').replace('/download', '');
    const record = this.exportService.getExport(auth.user.id, exportId);
    this.observability.emit({
      event_name: 'export.downloaded',
      user_id: auth.user.id,
      entity_id: record.id,
      metadata: { format: record.format },
    });

    return {
      status: 200,
      body: {
        export_id: record.id,
        file_name: record.file_name,
        mime_type: record.mime_type,
        content_base64: record.payload,
      },
    };
  }

  private listExportAuditLogs(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    const entries = this.exportService.listAuditByOwner(auth.user.id);
    return { status: 200, body: { entries } };
  }

  private getObservabilityAuditLog(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    return { status: 200, body: { entries: this.observability.listAuditLog() } };
  }

  private getDashboard(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);

    return {
      status: 200,
      body: {
        json: this.observability.dashboardJson(),
        csv: this.observability.dashboardCsv(),
      },
    };
  }

  private trackSecurityFailure(request: RequestLike, error: unknown): void {
    if (!(error instanceof Error)) {
      return;
    }

    if (error.message === 'INVALID_CREDENTIALS') {
      const creds = request.body as Partial<Credentials> | undefined;
      if (creds?.email) {
        const bruteForceKey = `${parseClientFingerprint(request)}:${creds.email}`;
        this.bruteForceLimiter.registerFailure(bruteForceKey);
      }
      this.securityMonitor.logFailedAuth(creds?.email ?? 'unknown', request.path, error.message);
    }

    if (error.message === 'FORBIDDEN') {
      this.securityMonitor.logDeniedAccess('authenticated-user', request.path, 'OWNER_ID_MISMATCH');
    }
  }

  private mapError(error: unknown): ResponseLike {
    if (!(error instanceof Error)) {
      return { status: 500, body: { error: 'INTERNAL_ERROR' } };
    }

    if (error.message === 'EMAIL_ALREADY_USED') {
      return { status: 409, body: { error: error.message } };
    }

    if (
      error.message === 'INVALID_CREDENTIALS' ||
      error.message === 'UNAUTHENTICATED' ||
      error.message === 'SESSION_INVALID' ||
      error.message === 'SESSION_NOT_FOUND'
    ) {
      return { status: 401, body: { error: error.message } };
    }

    if (error.message === 'INVALID_PAYLOAD') {
      return { status: 400, body: { error: error.message } };
    }

    if (error.message === 'RATE_LIMITED') {
      return { status: 429, body: { error: error.message } };
    }

    if (error.message === 'OWNER_SCOPE_REQUIRED') {
      return { status: 400, body: { error: error.message } };
    }

    if (error.message === 'FORBIDDEN') {
      return { status: 403, body: { error: error.message } };
    }

    if (error.message === 'EXPORT_NOT_FOUND') {
      return { status: 404, body: { error: error.message } };
    }

    return { status: 500, body: { error: 'INTERNAL_ERROR' } };
  }
}
