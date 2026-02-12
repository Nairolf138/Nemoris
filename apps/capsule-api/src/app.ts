import {
  createBelief,
  createLegacyMessage,
  createLesson,
  createMemory,
  createValueProfile,
  armLegacyMessage,
  deliverLegacyMessage,
  revokeLegacyMessage,
  triggerLegacyMessage,
  deleteBelief,
  deleteLegacyMessage,
  deleteLesson,
  deleteMemory,
  deleteValueProfile,
  updateBelief,
  updateLegacyMessage,
  updateLesson,
  updateMemory,
  updateValueProfile,
  type CapsulePersistence,
  type Beneficiary,
  type NarrativeEdge,
  type NarrativeNode,
  type Visibility,
  type ConsentScope,
} from '@capsule/core';
import { ExportAggregator } from '@capsule/export';
import { ObservabilityService } from '@capsule/observability';
import { AuthService } from './auth-service.js';
import {
  mapCreateBeliefInput,
  mapCreateBeneficiaryInput,
  mapCreateLegacyMessageInput,
  mapCreateLessonInput,
  mapCreateMemoryInput,
  mapCreateNarrativeEdgeInput,
  mapCreateNarrativeNodeInput,
  mapCreateValueProfileInput,
  mapUpdateBeliefInput,
  mapUpdateBeneficiaryInput,
  mapUpdateLegacyMessageInput,
  mapUpdateLessonInput,
  mapUpdateMemoryInput,
  mapUpdateNarrativeEdgeInput,
  mapUpdateNarrativeNodeInput,
  mapUpdateValueProfileInput,
} from './data-route-adapters.js';
import type { ExportRepository } from './export-repository.js';
import { ExportService } from './export-service.js';
import {
  ApiError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
  toApiError,
} from './errors.js';
import { createPersistenceProviders, type PersistenceProviders } from './persistence-config.js';
import { SlidingWindowRateLimiter } from './rate-limiter.js';
import {
  getDefaultSortBy,
  parseConsentPayload,
  parseCredentials,
  parseDataListQuery,
  parseExportPayload,
  parseOwnerScope,
  type DataCollection,
} from './request-validation.js';
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

const DATA_COLLECTIONS: readonly DataCollection[] = [
  'memories',
  'beliefs',
  'lessons',
  'value_profiles',
  'legacy_messages',
  'beneficiaries',
  'narrative_nodes',
  'narrative_edges',
];

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
  if (!DATA_COLLECTIONS.includes(collection)) {
    return null;
  }
  return { collection, id: parts[2] };
};

export interface CapsuleApiAppDependencies {
  authService?: AuthService;
  persistence?: CapsulePersistence;
  exportRepository?: ExportRepository;
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
    this.authService = dependencies.authService ?? new AuthService(providers.authStore, this.securityConfig.sessionTokenSecret);
    this.exportAggregator = new ExportAggregator({
      memories: this.persistence.memories,
      beliefs: this.persistence.beliefs,
      lessons: this.persistence.lessons,
      valueProfiles: this.persistence.valueProfiles,
      legacyMessages: this.persistence.legacyMessages,
      beneficiaries: this.persistence.beneficiaries,
    });
    this.exportService = new ExportService(this.exportAggregator, dependencies.exportRepository ?? providers.exportRepository);
  }

  public async handle(request: RequestLike): Promise<ResponseLike> {
    const requestStartMs = Date.now();
    try {
      if (request.method === 'POST' && request.path === '/auth/register') {
        this.enforceAuthRateLimits(request);
        const creds = parseCredentials(request.body);
        this.observability.emit({
          event_name: 'onboarding.started',
          user_id: creds.email,
          entity_id: '/auth/register',
          metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs),
        });
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
          throw new RateLimitedError(bruteForceStatus.retryAfterMs);
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
          throw new AuthError('UNAUTHENTICATED');
        }
        const auth = await this.authService.authenticate(token);
        await this.authService.logout(token);
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
          throw new AuthError('UNAUTHENTICATED');
        }
        const auth = await this.authService.authenticate(token);
        const session = await this.authService.refresh(token);
        this.observability.emit({
          event_name: 'auth.refresh',
          user_id: auth.user.id,
          entity_id: session.token,
          metadata: buildEventMetadata(request, 'success', Date.now() - requestStartMs, { previous_session: token }),
        });
        return { status: 200, body: { session } };
      }


      if (request.method === 'POST' && request.path === '/consent/grant') {
        return await this.grantConsent(request);
      }

      if (request.method === 'POST' && request.path === '/consent/revoke') {
        return await this.revokeConsent(request);
      }

      if (request.method === 'GET' && request.path.startsWith('/consent/history')) {
        return await this.consentHistory(request);
      }

      if (request.method === 'POST' && request.path === '/exports') {
        return await this.generateExport(request);
      }

      if (request.method === 'GET' && request.path.startsWith('/exports/') && request.path.endsWith('/download')) {
        return await this.downloadExport(request);
      }

      if (request.method === 'GET' && request.path === '/exports/audit') {
        return await this.listExportAuditLogs(request);
      }

      if (request.method === 'GET' && request.path === '/observability/audit') {
        return this.getObservabilityAuditLog(request);
      }

      if (request.method === 'GET' && request.path === '/observability/dashboard') {
        return this.getDashboard(request);
      }

      if (request.path.startsWith('/legacy-messages/')) {
        return await this.handleLegacyMessageOrchestrationRoute(request);
      }

      if (request.path.startsWith('/data/')) {
        return await this.handleDataRoute(request);
      }

      throw new NotFoundError('NOT_FOUND');
    } catch (error) {
      return this.handleError(request, error, Date.now() - requestStartMs);
    }
  }

  private enforceAuthRateLimits(request: RequestLike): void {
    const key = `${parseClientFingerprint(request)}:${request.path}`;
    const status = this.authRateLimiter.check(key);
    if (!status.allowed) {
      throw new RateLimitedError();
    }
  }

  private enforceOwnerAccess(request: RequestLike, userId: string): void {
    const requestedOwner = parseRequestedOwner(request);
    if (!requestedOwner) {
      throw new ValidationError('OWNER_SCOPE_REQUIRED');
    }
    if (requestedOwner !== userId) {
      throw new ForbiddenError();
    }
  }

  private createEntityMetadata(ownerId: string, visibility: Visibility): Pick<NarrativeNode, 'id' | 'owner_id' | 'visibility' | 'created_at' | 'updated_at'> {
    const now = new Date().toISOString();
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      owner_id: ownerId,
      visibility,
      created_at: now,
      updated_at: now,
    };
  }

  private async assertOwnedReferences(
    ownerId: string,
    field: string,
    ids: string[],
    getById: (id: string) => Promise<{ owner_id: string } | null>,
  ): Promise<void> {
    for (const id of ids) {
      const record = await getById(id);
      if (!record) {
        throw new ValidationError('DOMAIN_VALIDATION_ERROR', {
          message: `Field "${field}" contains unknown references.`,
          details: { field, id },
        });
      }
      if (record.owner_id !== ownerId) {
        throw new ForbiddenError();
      }
    }
  }

  private async validateNarrativeNodeReferences(
    ownerId: string,
    input: Pick<NarrativeNode, 'memory_ids' | 'belief_ids' | 'lesson_ids' | 'value_profile_ids'>,
  ): Promise<void> {
    await this.assertOwnedReferences(ownerId, 'memory_ids', input.memory_ids, this.persistence.memories.getById);
    await this.assertOwnedReferences(ownerId, 'belief_ids', input.belief_ids, this.persistence.beliefs.getById);
    await this.assertOwnedReferences(ownerId, 'lesson_ids', input.lesson_ids, this.persistence.lessons.getById);
    await this.assertOwnedReferences(ownerId, 'value_profile_ids', input.value_profile_ids, this.persistence.valueProfiles.getById);
  }

  private async validateNarrativeEdgeReferences(ownerId: string, input: Omit<NarrativeEdge, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<void> {
    if (input.from_node_id === input.to_node_id) {
      throw new ValidationError('DOMAIN_VALIDATION_ERROR', {
        message: 'Field "to_node_id" must differ from "from_node_id".',
      });
    }

    await this.assertOwnedReferences(ownerId, 'from_node_id', [input.from_node_id], this.persistence.narrativeNodes.getById);
    await this.assertOwnedReferences(ownerId, 'to_node_id', [input.to_node_id], this.persistence.narrativeNodes.getById);
    await this.assertOwnedReferences(ownerId, 'evidence_memory_ids', input.evidence_memory_ids, this.persistence.memories.getById);
    await this.assertOwnedReferences(ownerId, 'belief_ids', input.belief_ids, this.persistence.beliefs.getById);
    await this.assertOwnedReferences(ownerId, 'lesson_ids', input.lesson_ids, this.persistence.lessons.getById);
  }

  private async validateLegacyMessageBeneficiaries(ownerId: string, beneficiaryIds: string[]): Promise<string[]> {
    const normalized = [...new Set(beneficiaryIds)];
    if (normalized.length !== beneficiaryIds.length) {
      throw new ValidationError('DOMAIN_VALIDATION_ERROR', { message: 'Field "beneficiary_ids" contains duplicated references.' });
    }

    for (const beneficiaryId of normalized) {
      const beneficiary = await this.persistence.beneficiaries.getById(beneficiaryId);
      if (!beneficiary) {
        throw new ValidationError('DOMAIN_VALIDATION_ERROR', { message: 'Field "beneficiary_ids" contains unknown references.' });
      }
      if (beneficiary.owner_id !== ownerId) {
        throw new ForbiddenError();
      }
      if (beneficiary.status !== 'active') {
        throw new ValidationError('DOMAIN_VALIDATION_ERROR', { message: 'Field "beneficiary_ids" must reference active beneficiaries.' });
      }
      if (beneficiary.verification_status !== 'verified') {
        throw new ValidationError('DOMAIN_VALIDATION_ERROR', { message: 'Field "beneficiary_ids" must reference verified beneficiaries.' });
      }
    }

    return normalized;
  }

  private parseLegacyMessageOrchestrationRoute(
    path: string,
  ): { id: string; action: 'arm' | 'trigger' | 'revoke' | 'deliver' | 'delivery-attempts' } | null {
    const cleanPath = pathWithoutQuery(path);
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts[0] !== 'legacy-messages' || !parts[1] || !parts[2]) {
      return null;
    }
    const action = parts[2];
    if (action !== 'arm' && action !== 'trigger' && action !== 'revoke' && action !== 'deliver' && action !== 'delivery-attempts') {
      return null;
    }
    return { id: parts[1], action };
  }

  private async handleLegacyMessageOrchestrationRoute(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);

    const route = this.parseLegacyMessageOrchestrationRoute(request.path);
    if (!route) {
      throw new NotFoundError('NOT_FOUND');
    }

    const legacyMessage = await this.persistence.legacyMessages.getById(route.id);
    if (!legacyMessage) {
      throw new NotFoundError('RESOURCE_NOT_FOUND');
    }
    if (legacyMessage.owner_id !== auth.user.id) {
      throw new ForbiddenError();
    }

    if (request.method === 'GET' && route.action === 'delivery-attempts') {
      return { status: 200, body: await this.persistence.legacyMessageDeliveryAttempts.listByLegacyMessageId(route.id) };
    }

    if (request.method !== 'POST') {
      throw new NotFoundError('NOT_FOUND');
    }

    await this.assertConsentScope(request, auth.user.id, 'post_mortem_transmission');

    try {
      if (route.action === 'arm') {
        return { status: 200, body: await armLegacyMessage({ legacyMessageRepository: this.persistence.legacyMessages }, route.id) };
      }
      if (route.action === 'trigger') {
        return { status: 200, body: await triggerLegacyMessage({ legacyMessageRepository: this.persistence.legacyMessages }, route.id) };
      }
      if (route.action === 'revoke') {
        return { status: 200, body: await revokeLegacyMessage({ legacyMessageRepository: this.persistence.legacyMessages }, route.id) };
      }

      const result = await deliverLegacyMessage(
        {
          legacyMessageRepository: this.persistence.legacyMessages,
          legacyMessageDeliveryAttemptRepository: this.persistence.legacyMessageDeliveryAttempts,
          deliver: async (message) => {
            if (message.message.includes('[FAIL_DELIVERY]')) {
              throw new Error('Simulated delivery failure');
            }
          },
        },
        route.id,
      );
      return { status: 200, body: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'LEGACY_MESSAGE_INVALID_STATE') {
        throw new ValidationError('DOMAIN_VALIDATION_ERROR', { message: 'Invalid legacy message state transition.' });
      }
      if (error instanceof Error && error.message === 'LEGACY_MESSAGE_NOT_FOUND') {
        throw new NotFoundError('RESOURCE_NOT_FOUND');
      }
      throw error;
    }
  }

  private async handleDataRoute(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);

    const route = parseDataRoute(request.path);
    if (!route) {
      throw new NotFoundError('NOT_FOUND');
    }

    if (request.method === 'GET' && !route.id) {
      const query = parseDataListQuery(route.collection, request.path);
      const sort = query.sort ?? getDefaultSortBy(route.collection);

      if (route.collection === 'memories') {
        return { status: 200, body: await this.persistence.memories.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }
      if (route.collection === 'beliefs') {
        return { status: 200, body: await this.persistence.beliefs.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }
      if (route.collection === 'lessons') {
        return { status: 200, body: await this.persistence.lessons.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }
      if (route.collection === 'value_profiles') {
        return { status: 200, body: await this.persistence.valueProfiles.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }
      if (route.collection === 'legacy_messages') {
        return { status: 200, body: await this.persistence.legacyMessages.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }
      if (route.collection === 'beneficiaries') {
        return { status: 200, body: await this.persistence.beneficiaries.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }
      if (route.collection === 'narrative_nodes') {
        return { status: 200, body: await this.persistence.narrativeNodes.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
      }

      return { status: 200, body: await this.persistence.narrativeEdges.listByOwnerPaginated(auth.user.id, { limit: query.limit, offset: query.offset, sortBy: sort, order: query.order }) };
    }

    if (request.method === 'POST' && !route.id) {
      if (route.collection === 'memories') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const created = await createMemory({ memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, lessonRepository: this.persistence.lessons, valueProfileRepository: this.persistence.valueProfiles, narrativeNodeRepository: this.persistence.narrativeNodes, observer: { emitEvent: (event) => this.observability.emit(event) } }, mapCreateMemoryInput(request.body, auth.user.id));
        return { status: 201, body: created };
      }
      if (route.collection === 'beliefs') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const created = await createBelief({ beliefRepository: this.persistence.beliefs, memoryRepository: this.persistence.memories, lessonRepository: this.persistence.lessons }, mapCreateBeliefInput(request.body, auth.user.id));
        return { status: 201, body: created };
      }
      if (route.collection === 'lessons') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const created = await createLesson({ lessonRepository: this.persistence.lessons, memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, valueProfileRepository: this.persistence.valueProfiles }, mapCreateLessonInput(request.body, auth.user.id));
        return { status: 201, body: created };
      }
      if (route.collection === 'value_profiles') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const created = await createValueProfile({ valueProfileRepository: this.persistence.valueProfiles, memoryRepository: this.persistence.memories, narrativeNodeRepository: this.persistence.narrativeNodes }, mapCreateValueProfileInput(request.body, auth.user.id));
        return { status: 201, body: created };
      }
      if (route.collection === 'legacy_messages') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const input = mapCreateLegacyMessageInput(request.body, auth.user.id);
        input.beneficiary_ids = await this.validateLegacyMessageBeneficiaries(auth.user.id, input.beneficiary_ids);
        const created = await createLegacyMessage({ legacyMessageRepository: this.persistence.legacyMessages, memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, lessonRepository: this.persistence.lessons, valueProfileRepository: this.persistence.valueProfiles, narrativeNodeRepository: this.persistence.narrativeNodes, beneficiaryRepository: this.persistence.beneficiaries, observer: { emitEvent: (event) => this.observability.emit(event) } }, input);
        return { status: 201, body: created };
      }
      if (route.collection === 'beneficiaries') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const input = mapCreateBeneficiaryInput(request.body, auth.user.id);
        const beneficiary: Beneficiary = { ...this.createEntityMetadata(auth.user.id, input.visibility), ...input };
        return { status: 201, body: await this.persistence.beneficiaries.create(beneficiary) };
      }
      if (route.collection === 'narrative_nodes') {
        const payload = request.body as { visibility?: Visibility } | undefined;
        if (payload?.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const input = mapCreateNarrativeNodeInput(request.body, auth.user.id);
        await this.validateNarrativeNodeReferences(auth.user.id, input);
        const node: NarrativeNode = { ...this.createEntityMetadata(auth.user.id, input.visibility), ...input };
        return { status: 201, body: await this.persistence.narrativeNodes.create(node) };
      }

      const payload = request.body as { visibility?: Visibility } | undefined;
      if (payload?.visibility === 'posthumous') {
        await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
      }
      const input = mapCreateNarrativeEdgeInput(request.body, auth.user.id);
      await this.validateNarrativeEdgeReferences(auth.user.id, input);
      const edge: NarrativeEdge = { ...this.createEntityMetadata(auth.user.id, input.visibility), ...input };
      return { status: 201, body: await this.persistence.narrativeEdges.create(edge) };
    }

    if (request.method === 'PATCH' && route.id) {
      if (route.collection === 'memories') {
        const updated = await updateMemory({ memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, lessonRepository: this.persistence.lessons, valueProfileRepository: this.persistence.valueProfiles, narrativeNodeRepository: this.persistence.narrativeNodes, observer: { emitEvent: (event) => this.observability.emit(event) } }, route.id, mapUpdateMemoryInput(request.body));
        if (!updated) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new ForbiddenError();
        return { status: 200, body: updated };
      }
      if (route.collection === 'beliefs') {
        const updated = await updateBelief({ beliefRepository: this.persistence.beliefs, memoryRepository: this.persistence.memories, lessonRepository: this.persistence.lessons }, route.id, mapUpdateBeliefInput(request.body));
        if (!updated) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new ForbiddenError();
        return { status: 200, body: updated };
      }
      if (route.collection === 'lessons') {
        const updated = await updateLesson({ lessonRepository: this.persistence.lessons, memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, valueProfileRepository: this.persistence.valueProfiles }, route.id, mapUpdateLessonInput(request.body));
        if (!updated) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new ForbiddenError();
        return { status: 200, body: updated };
      }
      if (route.collection === 'value_profiles') {
        const updated = await updateValueProfile({ valueProfileRepository: this.persistence.valueProfiles, memoryRepository: this.persistence.memories, narrativeNodeRepository: this.persistence.narrativeNodes }, route.id, mapUpdateValueProfileInput(request.body));
        if (!updated) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new ForbiddenError();
        return { status: 200, body: updated };
      }
      if (route.collection === 'legacy_messages') {
        const patch = mapUpdateLegacyMessageInput(request.body);
        if (patch.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        if (patch.beneficiary_ids !== undefined) {
          patch.beneficiary_ids = await this.validateLegacyMessageBeneficiaries(auth.user.id, patch.beneficiary_ids);
        }
        const updated = await updateLegacyMessage({ legacyMessageRepository: this.persistence.legacyMessages, memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, lessonRepository: this.persistence.lessons, valueProfileRepository: this.persistence.valueProfiles, narrativeNodeRepository: this.persistence.narrativeNodes, beneficiaryRepository: this.persistence.beneficiaries, observer: { emitEvent: (event) => this.observability.emit(event) } }, route.id, patch);
        if (!updated) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (updated.owner_id !== auth.user.id) throw new ForbiddenError();
        return { status: 200, body: updated };
      }
      if (route.collection === 'beneficiaries') {
        const existing = await this.persistence.beneficiaries.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        const patch = mapUpdateBeneficiaryInput(request.body);
        if (patch.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        const updated = await this.persistence.beneficiaries.update(route.id, { ...patch, updated_at: new Date().toISOString() });
        return { status: 200, body: updated };
      }
      if (route.collection === 'narrative_nodes') {
        const existing = await this.persistence.narrativeNodes.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        const patch = mapUpdateNarrativeNodeInput(request.body);
        if (patch.visibility === 'posthumous') {
          await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
        }
        await this.validateNarrativeNodeReferences(auth.user.id, {
          memory_ids: patch.memory_ids ?? existing.memory_ids,
          belief_ids: patch.belief_ids ?? existing.belief_ids,
          lesson_ids: patch.lesson_ids ?? existing.lesson_ids,
          value_profile_ids: patch.value_profile_ids ?? existing.value_profile_ids,
        });
        const updated = await this.persistence.narrativeNodes.update(route.id, { ...patch, updated_at: new Date().toISOString() });
        return { status: 200, body: updated };
      }

      const existing = await this.persistence.narrativeEdges.getById(route.id);
      if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
      if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
      const patch = mapUpdateNarrativeEdgeInput(request.body);
      if (patch.visibility === 'posthumous') {
        await this.assertConsentScope(request, auth.user.id, 'posthumous_visibility');
      }
      const merged: Omit<NarrativeEdge, 'id' | 'owner_id' | 'created_at' | 'updated_at'> = {
        visibility: patch.visibility ?? existing.visibility,
        from_node_id: patch.from_node_id ?? existing.from_node_id,
        to_node_id: patch.to_node_id ?? existing.to_node_id,
        relation_type: patch.relation_type ?? existing.relation_type,
        weight: patch.weight ?? existing.weight,
        evidence_memory_ids: patch.evidence_memory_ids ?? existing.evidence_memory_ids,
        belief_ids: patch.belief_ids ?? existing.belief_ids,
        lesson_ids: patch.lesson_ids ?? existing.lesson_ids,
      };
      await this.validateNarrativeEdgeReferences(auth.user.id, merged);
      const updated = await this.persistence.narrativeEdges.update(route.id, { ...patch, updated_at: new Date().toISOString() });
      return { status: 200, body: updated };
    }

    if (request.method === 'DELETE' && route.id) {
      let deleted = false;

      if (route.collection === 'memories') {
        const existing = await this.persistence.memories.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await deleteMemory({ memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, lessonRepository: this.persistence.lessons, valueProfileRepository: this.persistence.valueProfiles, narrativeNodeRepository: this.persistence.narrativeNodes, observer: { emitEvent: (event) => this.observability.emit(event) } }, route.id);
      } else if (route.collection === 'beliefs') {
        const existing = await this.persistence.beliefs.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await deleteBelief({ beliefRepository: this.persistence.beliefs, memoryRepository: this.persistence.memories, lessonRepository: this.persistence.lessons }, route.id);
      } else if (route.collection === 'lessons') {
        const existing = await this.persistence.lessons.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await deleteLesson({ lessonRepository: this.persistence.lessons, memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, valueProfileRepository: this.persistence.valueProfiles }, route.id);
      } else if (route.collection === 'value_profiles') {
        const existing = await this.persistence.valueProfiles.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await deleteValueProfile({ valueProfileRepository: this.persistence.valueProfiles, memoryRepository: this.persistence.memories, narrativeNodeRepository: this.persistence.narrativeNodes }, route.id);
      } else if (route.collection === 'legacy_messages') {
        const existing = await this.persistence.legacyMessages.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await deleteLegacyMessage({ legacyMessageRepository: this.persistence.legacyMessages, memoryRepository: this.persistence.memories, beliefRepository: this.persistence.beliefs, lessonRepository: this.persistence.lessons, valueProfileRepository: this.persistence.valueProfiles, narrativeNodeRepository: this.persistence.narrativeNodes, beneficiaryRepository: this.persistence.beneficiaries, observer: { emitEvent: (event) => this.observability.emit(event) } }, route.id);
      } else if (route.collection === 'beneficiaries') {
        const existing = await this.persistence.beneficiaries.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await this.persistence.beneficiaries.delete(route.id);
      } else if (route.collection === 'narrative_nodes') {
        const existing = await this.persistence.narrativeNodes.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await this.persistence.narrativeNodes.delete(route.id);
      } else {
        const existing = await this.persistence.narrativeEdges.getById(route.id);
        if (!existing) throw new NotFoundError('RESOURCE_NOT_FOUND');
        if (existing.owner_id !== auth.user.id) throw new ForbiddenError();
        deleted = await this.persistence.narrativeEdges.delete(route.id);
      }

      if (!deleted) {
        throw new NotFoundError('RESOURCE_NOT_FOUND');
      }

      return { status: 204, body: null };
    }

    throw new NotFoundError('NOT_FOUND');
  }


  private async assertConsentScope(request: RequestLike, userId: string, scope: ConsentScope): Promise<void> {
    const granted = await this.persistence.consents.isGranted(userId, scope);
    if (granted) {
      return;
    }

    this.observability.emit({
      event_name: 'consent.denied',
      user_id: userId,
      entity_id: userId,
      metadata: {
        route: pathWithoutQuery(request.path),
        scope,
      },
    });
    throw new ForbiddenError();
  }

  private async grantConsent(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }
    const auth = await this.authService.authenticate(token);
    const payload = parseConsentPayload(request.body);
    this.enforceOwnerAccess(request, auth.user.id);
    if (payload.owner_id !== auth.user.id) {
      throw new ForbiddenError();
    }

    const granted = await this.persistence.consents.grant({
      owner_id: auth.user.id,
      scope: payload.scope,
      granted_at: new Date().toISOString(),
      legal_basis: payload.legal_basis,
    });

    this.observability.emit({
      event_name: 'consent.granted',
      user_id: auth.user.id,
      entity_id: granted.id,
      metadata: { scope: granted.scope, legal_basis: granted.legal_basis },
    });

    return { status: 201, body: granted };
  }

  private async revokeConsent(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }
    const auth = await this.authService.authenticate(token);
    const payload = parseConsentPayload(request.body);
    this.enforceOwnerAccess(request, auth.user.id);
    if (payload.owner_id !== auth.user.id) {
      throw new ForbiddenError();
    }

    const revoked = await this.persistence.consents.revoke({
      owner_id: auth.user.id,
      scope: payload.scope,
      revoked_at: new Date().toISOString(),
      legal_basis: payload.legal_basis,
    });

    this.observability.emit({
      event_name: 'consent.revoked',
      user_id: auth.user.id,
      entity_id: revoked.id,
      metadata: { scope: revoked.scope, legal_basis: revoked.legal_basis },
    });

    return { status: 200, body: revoked };
  }

  private async consentHistory(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);

    return { status: 200, body: { entries: await this.persistence.consents.listByOwner(auth.user.id) } };
  }

  private async generateExport(request: RequestLike): Promise<ResponseLike> {
    const requestStartMs = Date.now();
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    const exportPayload = parseExportPayload(request.body);
    this.enforceOwnerAccess(request, auth.user.id);
    await this.assertConsentScope(request, auth.user.id, 'data_export');
    const format = exportPayload.format ?? 'json';
    let generated;
    try {
      generated = await this.exportService.createExport(auth.user.id, auth.user.id, format);
    } catch (error) {
      this.observability.emit({
        event_name: 'export.failed',
        user_id: auth.user.id,
        entity_id: auth.user.id,
        metadata: buildEventMetadata(request, 'failure', Date.now() - requestStartMs, { format }),
      });
      throw error;
    }
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

  private async downloadExport(request: RequestLike): Promise<ResponseLike> {
    const requestStartMs = Date.now();
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    await this.assertConsentScope(request, auth.user.id, 'data_export');
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

  private async listExportAuditLogs(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    await this.assertConsentScope(request, auth.user.id, 'data_export');
    const entries = this.exportService.listAuditByOwner(auth.user.id);
    return { status: 200, body: { entries } };
  }

  private async getObservabilityAuditLog(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);
    return { status: 200, body: { entries: this.observability.listAuditLog() } };
  }

  private async getDashboard(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      throw new AuthError('UNAUTHENTICATED');
    }

    const auth = await this.authService.authenticate(token);
    this.enforceOwnerAccess(request, auth.user.id);

    return {
      status: 200,
      body: {
        schema_version: 2,
        backward_compatible_with: [1],
        dashboard: this.observability.dashboardJsonV2(),
        json: this.observability.dashboardJson(),
        csv: this.observability.dashboardCsv(),
      },
    };
  }

  private trackSecurityFailure(request: RequestLike, error: ApiError, durationMs: number): void {
    if (error.code === 'INVALID_CREDENTIALS') {
      const creds = request.body as { email?: string } | undefined;
      if (creds?.email) {
        const bruteForceKey = `${parseClientFingerprint(request)}:${creds.email}`;
        this.bruteForceLimiter.registerFailure(bruteForceKey);
      }
      this.securityMonitor.logFailedAuth(creds?.email ?? 'unknown', request.path, error.code, durationMs);
    }

    if (error.code === 'FORBIDDEN') {
      this.securityMonitor.logDeniedAccess('authenticated-user', request.path, 'OWNER_ID_MISMATCH', durationMs);
    }
  }

  private handleError(request: RequestLike, error: unknown, durationMs: number): ResponseLike {
    const apiError = toApiError(error);
    this.trackSecurityFailure(request, apiError, durationMs);
    this.observability.emit({
      event_name: 'api.request_failed',
      user_id: 'system',
      entity_id: pathWithoutQuery(request.path),
      metadata: buildEventMetadata(request, apiError.httpStatus === 403 ? 'denied' : 'failure', durationMs, {
        error_code: apiError.code,
        http_status: apiError.httpStatus,
      }),
    });
    return {
      status: apiError.httpStatus,
      body: apiError.toPayload(),
    };
  }
}
