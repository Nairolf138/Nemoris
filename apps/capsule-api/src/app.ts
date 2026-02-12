import {
  ValidationError,
  createBelief,
  createLegacyMessage,
  createLesson,
  createMemory,
  createValueProfile,
  deleteBelief,
  deleteLegacyMessage,
  deleteLesson,
  deleteMemory,
  deleteValueProfile,
  listBeliefs,
  listLegacyMessages,
  listLessons,
  listMemories,
  listValueProfiles,
  updateBelief,
  updateLegacyMessage,
  updateLesson,
  updateMemory,
  updateValueProfile,
  type CapsulePersistence,
} from '@capsule/core';
import { ExportAggregator } from '@capsule/export';
import { ObservabilityService } from '@capsule/observability';
import { AuthService } from './auth-service.js';
import {
  mapCreateBeliefInput,
  mapCreateLegacyMessageInput,
  mapCreateLessonInput,
  mapCreateMemoryInput,
  mapCreateValueProfileInput,
  mapUpdateBeliefInput,
  mapUpdateLegacyMessageInput,
  mapUpdateLessonInput,
  mapUpdateMemoryInput,
  mapUpdateValueProfileInput,
} from './data-route-adapters.js';
import { ExportService } from './export-service.js';
import { createPersistenceProviders, type PersistenceProviders } from './persistence-config.js';
import { SlidingWindowRateLimiter } from './rate-limiter.js';
import { parseCredentials, parseExportPayload, parseOwnerScope } from './request-validation.js';
import { loadSecurityConfig } from './security-config.js';
import { SecurityMonitor } from './security-monitor.js';
import type { RequestLike, ResponseLike } from './types.js';

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

const pathWithoutQuery = (path: string): string => path.split('?')[0] ?? path;

const parseRequestedOwner = (request: RequestLike): string | undefined => {
  const ownerFromHeader = parseOwnerScope(request.headers?.['x-owner-id']);
  if (ownerFromHeader) {
    return ownerFromHeader;
  }

  const payload = request.body as { owner_id?: string } | undefined;
  const ownerFromPayload = parseOwnerScope(payload?.owner_id);
  if (ownerFromPayload) {
    return ownerFromPayload;
  }

  const [, queryString] = request.path.split('?');
  if (!queryString) {
    return undefined;
  }

  const params = new URLSearchParams(queryString);
  return parseOwnerScope(params.get('owner_id') ?? undefined);
};

const parseClientFingerprint = (request: RequestLike): string => {
  const ip = request.headers?.['x-forwarded-for']?.split(',')[0]?.trim();
  return ip || request.headers?.['x-client-id'] || 'unknown-client';
};


const latencyBucket = (durationMs: number): string => {
  if (durationMs < 100) return 'lt_100ms';
  if (durationMs < 300) return '100_299ms';
  if (durationMs < 1000) return '300_999ms';
  return 'gte_1000ms';
};

const buildEventMetadata = (
  request: RequestLike,
  outcome: 'success' | 'failure' | 'denied' | 'alert',
  durationMs: number,
  metadata: Record<string, unknown> = {},
): Record<string, unknown> => ({
  actor_type: 'user',
  route: pathWithoutQuery(request.path),
  outcome,
  latency_bucket: latencyBucket(durationMs),
  ...metadata,
});

type DataCollection = 'memories' | 'beliefs' | 'lessons' | 'value_profiles' | 'legacy_messages';

const parseDataRoute = (path: string): { collection: DataCollection; id?: string } | null => {
  const cleanPath = pathWithoutQuery(path);
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts[0] !== 'data') {
    return null;
  }
  const collection = parts[1] as DataCollection | undefined;
  if (!collection) {
    return null;
  }
  if (!['memories', 'beliefs', 'lessons', 'value_profiles', 'legacy_messages'].includes(collection)) {
    return null;
  }
  return { collection, id: parts[2] };
};

export interface CapsuleApiAppDependencies {
  authService?: AuthService;
  persistence?: CapsulePersistence;
}

export class CapsuleApiApp {
  private readonly authService: AuthService;
  private observability = new ObservabilityService();
  private readonly persistence: CapsulePersistence;
  private readonly exportAggregator: ExportAggregator;
  private readonly exportService: ExportService;
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

  public constructor(dependencies: CapsuleApiAppDependencies = {}) {
    const providers: PersistenceProviders = createPersistenceProviders();
    this.persistence = dependencies.persistence ?? providers.capsulePersistence;
    this.authService = dependencies.authService ?? new AuthService(providers.authStore);
    this.exportAggregator = new ExportAggregator({
      memories: this.persistence.memories,
      beliefs: this.persistence.beliefs,
      lessons: this.persistence.lessons,
      valueProfiles: this.persistence.valueProfiles,
      legacyMessages: this.persistence.legacyMessages,
    });
    this.exportService = new ExportService(this.exportAggregator);
  }

  public async handle(request: RequestLike): Promise<ResponseLike> {
    const requestStartMs = Date.now();
    try {
      if (request.method === 'POST' && request.path === '/auth/register') {
        this.enforceAuthRateLimits(request);
        const creds = parseCredentials(request.body);
        const auth = await this.authService.register(creds.email, creds.password);
        this.observability.emit({
          event_name: 'onboarding.completed',
          user_id: auth.user.id,
          entity_id: auth.user.id,
          metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs, { email: auth.user.email }),
        });
        return { status: 201, body: auth };
      }

      if (request.method === 'POST' && request.path === '/auth/login') {
        this.enforceAuthRateLimits(request);
        const creds = parseCredentials(request.body);
        const bruteForceKey = `${parseClientFingerprint(request)}:${creds.email}`;
        const bruteForceStatus = this.bruteForceLimiter.check(bruteForceKey);
        if (!bruteForceStatus.allowed) {
          this.securityMonitor.logFailedAuth(creds.email, request.path, 'BRUTE_FORCE_BLOCKED', Date.now() - requestStartMs);
          return { status: 429, body: { error: 'RATE_LIMITED', retry_after_ms: bruteForceStatus.retryAfterMs } };
        }

        const auth = await this.authService.login(creds.email, creds.password);
        this.observability.emit({
          event_name: 'auth.login',
          user_id: auth.user.id,
          entity_id: auth.session.token,
          metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs),
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
          metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs),
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
          metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs, { previous_session: token }),
        });
        return { status: 200, body: { session } };
      }

      if (request.method === 'POST' && request.path === '/exports') {
        return await this.generateExport(request);
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
        return await this.handleDataRoute(request);
      }

      return { status: 404, body: { error: 'NOT_FOUND' } };
    } catch (error) {
      this.trackSecurityFailure(request, error, Date.now() - requestStartMs);
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

  private async handleDataRoute(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);

    const route = parseDataRoute(request.path);
    if (!route) {
      return { status: 404, body: { error: 'NOT_FOUND' } };
    }

    if (request.method === 'GET' && !route.id) {
      if (route.collection === 'memories') {
        return { status: 200, body: await listMemories({ memoryRepository: this.persistence.memories }, auth.user.id) };
      }
      if (route.collection === 'beliefs') {
        return { status: 200, body: await listBeliefs({ beliefRepository: this.persistence.beliefs }, auth.user.id) };
      }
      if (route.collection === 'lessons') {
        return { status: 200, body: await listLessons({ lessonRepository: this.persistence.lessons }, auth.user.id) };
      }
      if (route.collection === 'value_profiles') {
        return {
          status: 200,
          body: await listValueProfiles({ valueProfileRepository: this.persistence.valueProfiles }, auth.user.id),
        };
      }
      return {
        status: 200,
        body: await listLegacyMessages({ legacyMessageRepository: this.persistence.legacyMessages }, auth.user.id),
      };
    }

    if (request.method === 'POST' && !route.id) {
      if (route.collection === 'memories') {
        const created = await createMemory(
          {
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            lessonRepository: this.persistence.lessons,
            valueProfileRepository: this.persistence.valueProfiles,
            narrativeNodeRepository: this.persistence.narrativeNodes,
            observer: { emitEvent: (event) => this.observability.emit(event) },
          },
          mapCreateMemoryInput(request.body, auth.user.id),
        );
        return { status: 201, body: created };
      }

      if (route.collection === 'beliefs') {
        const created = await createBelief(
          {
            beliefRepository: this.persistence.beliefs,
            memoryRepository: this.persistence.memories,
            lessonRepository: this.persistence.lessons,
          },
          mapCreateBeliefInput(request.body, auth.user.id),
        );
        return { status: 201, body: created };
      }

      if (route.collection === 'lessons') {
        const created = await createLesson(
          {
            lessonRepository: this.persistence.lessons,
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            valueProfileRepository: this.persistence.valueProfiles,
          },
          mapCreateLessonInput(request.body, auth.user.id),
        );
        return { status: 201, body: created };
      }

      if (route.collection === 'value_profiles') {
        const created = await createValueProfile(
          {
            valueProfileRepository: this.persistence.valueProfiles,
            memoryRepository: this.persistence.memories,
            narrativeNodeRepository: this.persistence.narrativeNodes,
          },
          mapCreateValueProfileInput(request.body, auth.user.id),
        );
        return { status: 201, body: created };
      }

      const created = await createLegacyMessage(
        {
          legacyMessageRepository: this.persistence.legacyMessages,
          memoryRepository: this.persistence.memories,
          beliefRepository: this.persistence.beliefs,
          lessonRepository: this.persistence.lessons,
          valueProfileRepository: this.persistence.valueProfiles,
          narrativeNodeRepository: this.persistence.narrativeNodes,
          observer: { emitEvent: (event) => this.observability.emit(event) },
        },
        mapCreateLegacyMessageInput(request.body, auth.user.id),
      );
      return { status: 201, body: created };
    }

    if (request.method === 'PATCH' && route.id) {
      if (route.collection === 'memories') {
        const updated = await updateMemory(
          {
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            lessonRepository: this.persistence.lessons,
            valueProfileRepository: this.persistence.valueProfiles,
            narrativeNodeRepository: this.persistence.narrativeNodes,
            observer: { emitEvent: (event) => this.observability.emit(event) },
          },
          route.id,
          mapUpdateMemoryInput(request.body),
        );
        if (!updated) throw new Error('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        return { status: 200, body: updated };
      }

      if (route.collection === 'beliefs') {
        const updated = await updateBelief(
          {
            beliefRepository: this.persistence.beliefs,
            memoryRepository: this.persistence.memories,
            lessonRepository: this.persistence.lessons,
          },
          route.id,
          mapUpdateBeliefInput(request.body),
        );
        if (!updated) throw new Error('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        return { status: 200, body: updated };
      }

      if (route.collection === 'lessons') {
        const updated = await updateLesson(
          {
            lessonRepository: this.persistence.lessons,
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            valueProfileRepository: this.persistence.valueProfiles,
          },
          route.id,
          mapUpdateLessonInput(request.body),
        );
        if (!updated) throw new Error('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        return { status: 200, body: updated };
      }

      if (route.collection === 'value_profiles') {
        const updated = await updateValueProfile(
          {
            valueProfileRepository: this.persistence.valueProfiles,
            memoryRepository: this.persistence.memories,
            narrativeNodeRepository: this.persistence.narrativeNodes,
          },
          route.id,
          mapUpdateValueProfileInput(request.body),
        );
        if (!updated) throw new Error('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        return { status: 200, body: updated };
      }

      const updated = await updateLegacyMessage(
        {
          legacyMessageRepository: this.persistence.legacyMessages,
          memoryRepository: this.persistence.memories,
          beliefRepository: this.persistence.beliefs,
          lessonRepository: this.persistence.lessons,
          valueProfileRepository: this.persistence.valueProfiles,
          narrativeNodeRepository: this.persistence.narrativeNodes,
          observer: { emitEvent: (event) => this.observability.emit(event) },
        },
        route.id,
        mapUpdateLegacyMessageInput(request.body),
      );
      if (!updated) throw new Error('RESOURCE_NOT_FOUND');
      if (updated.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
      return { status: 200, body: updated };
    }

    if (request.method === 'DELETE' && route.id) {
      let deleted = false;
      if (route.collection === 'memories') {
        const existing = await this.persistence.memories.getById(route.id);
        if (!existing) throw new Error('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        deleted = await deleteMemory(
          {
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            lessonRepository: this.persistence.lessons,
            valueProfileRepository: this.persistence.valueProfiles,
            narrativeNodeRepository: this.persistence.narrativeNodes,
            observer: { emitEvent: (event) => this.observability.emit(event) },
          },
          route.id,
        );
      } else if (route.collection === 'beliefs') {
        const existing = await this.persistence.beliefs.getById(route.id);
        if (!existing) throw new Error('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        deleted = await deleteBelief(
          {
            beliefRepository: this.persistence.beliefs,
            memoryRepository: this.persistence.memories,
            lessonRepository: this.persistence.lessons,
          },
          route.id,
        );
      } else if (route.collection === 'lessons') {
        const existing = await this.persistence.lessons.getById(route.id);
        if (!existing) throw new Error('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        deleted = await deleteLesson(
          {
            lessonRepository: this.persistence.lessons,
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            valueProfileRepository: this.persistence.valueProfiles,
          },
          route.id,
        );
      } else if (route.collection === 'value_profiles') {
        const existing = await this.persistence.valueProfiles.getById(route.id);
        if (!existing) throw new Error('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        deleted = await deleteValueProfile(
          {
            valueProfileRepository: this.persistence.valueProfiles,
            memoryRepository: this.persistence.memories,
            narrativeNodeRepository: this.persistence.narrativeNodes,
          },
          route.id,
        );
      } else {
        const existing = await this.persistence.legacyMessages.getById(route.id);
        if (!existing) throw new Error('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new Error('FORBIDDEN');
        deleted = await deleteLegacyMessage(
          {
            legacyMessageRepository: this.persistence.legacyMessages,
            memoryRepository: this.persistence.memories,
            beliefRepository: this.persistence.beliefs,
            lessonRepository: this.persistence.lessons,
            valueProfileRepository: this.persistence.valueProfiles,
            narrativeNodeRepository: this.persistence.narrativeNodes,
            observer: { emitEvent: (event) => this.observability.emit(event) },
          },
          route.id,
        );
      }

      if (!deleted) {
        throw new Error('RESOURCE_NOT_FOUND');
      }

      return { status: 204, body: null };
    }

    return { status: 404, body: { error: 'NOT_FOUND' } };
  }

  private async generateExport(request: RequestLike): Promise<ResponseLike> {
    const requestStartMs = Date.now();
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    const exportPayload = parseExportPayload(request.body);
    this.enforceOwnerAccess(request, auth.user.id);
    const format = exportPayload.format ?? 'json';
    const generated = await this.exportService.createExport(auth.user.id, auth.user.id, format);
    this.observability.emit({
      event_name: 'export.created',
      user_id: auth.user.id,
      entity_id: generated.id,
      metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs, { format: generated.format }),
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
    const requestStartMs = Date.now();
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    const exportId = pathWithoutQuery(request.path).replace('/exports/', '').replace('/download', '');
    const record = this.exportService.getExport(auth.user.id, exportId);
    this.observability.emit({
      event_name: 'export.downloaded',
      user_id: auth.user.id,
      entity_id: record.id,
      metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs, { format: record.format }),
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

  private trackSecurityFailure(request: RequestLike, error: unknown, durationMs: number): void {
    if (!(error instanceof Error)) {
      return;
    }

    if (error.message === 'INVALID_CREDENTIALS') {
      const creds = request.body as { email?: string } | undefined;
      if (creds?.email) {
        const bruteForceKey = `${parseClientFingerprint(request)}:${creds.email}`;
        this.bruteForceLimiter.registerFailure(bruteForceKey);
      }
      this.securityMonitor.logFailedAuth(creds?.email ?? 'unknown', request.path, error.message, durationMs);
    }

    if (error.message === 'FORBIDDEN') {
      this.securityMonitor.logDeniedAccess('authenticated-user', request.path, 'OWNER_ID_MISMATCH', durationMs);
    }
  }

  private mapError(error: unknown): ResponseLike {
    if (!(error instanceof Error)) {
      return { status: 500, body: { error: 'INTERNAL_ERROR' } };
    }

    if (error instanceof ValidationError) {
      return { status: 400, body: { error: error.message } };
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

    if (
      error.message === 'INVALID_PAYLOAD' ||
      error.message === 'INVALID_EMAIL' ||
      error.message === 'WEAK_PASSWORD' ||
      error.message === 'INVALID_EXPORT_FORMAT' ||
      error.message === 'INVALID_OWNER_SCOPE'
    ) {
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

    if (error.message === 'EXPORT_NOT_FOUND' || error.message === 'RESOURCE_NOT_FOUND') {
      return { status: 404, body: { error: error.message } };
    }

    return { status: 500, body: { error: 'INTERNAL_ERROR' } };
  }
}
