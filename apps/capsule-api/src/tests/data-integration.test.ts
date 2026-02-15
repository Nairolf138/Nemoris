import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

type DataResource =
  | 'memories'
  | 'beliefs'
  | 'lessons'
  | 'value_profiles'
  | 'legacy_messages'
  | 'beneficiaries'
  | 'narrative_nodes'
  | 'narrative_edges'
  | 'external_attachments';

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

const createPayloadByResource: Record<DataResource, Record<string, unknown>> = {
  memories: {
    visibility: 'private',
    occurred_at: '2024-01-01T10:00:00.000Z',
    title: 'My memory',
    related_belief_ids: [],
    related_lesson_ids: [],
    related_value_profile_ids: [],
    related_narrative_node_ids: [],
  },
  beliefs: {
    visibility: 'private',
    belief_key: 'belief-1',
    statement: 'Learning matters',
    status: 'active',
    current_version_number: 1,
    evidence_memory_ids: [],
    related_lesson_ids: [],
  },
  lessons: {
    visibility: 'private',
    title: 'A lesson',
    lesson_text: 'Always verify',
    source_memory_ids: [],
    linked_belief_ids: [],
    linked_value_profile_ids: [],
  },
  value_profiles: {
    visibility: 'private',
    profile_label: 'Core values',
    values: [{ value_id: 'v1', label: 'Integrity', score: 85 }],
    current_version_number: 1,
    evidence_memory_ids: [],
    narrative_node_ids: [],
  },
  beneficiaries: {
    visibility: 'private',
    identity: 'Alice',
    channel: 'email',
    contact: 'alice@example.com',
    verification_status: 'verified',
    status: 'active',
  },
  legacy_messages: {
    visibility: 'private',
    title: 'Final note',
    message: 'Be kind',
    trigger_type: 'manual',
    beneficiary_ids: ['__SETUP_BENEFICIARY__'],
    attachment_memory_ids: [],
    related_belief_ids: [],
    related_lesson_ids: [],
    related_value_profile_ids: [],
    related_narrative_node_ids: [],
    state: 'draft',
  },
  narrative_nodes: {
    visibility: 'private',
    node_type: 'event',
    label: 'Key event',
    memory_ids: [],
    belief_ids: [],
    lesson_ids: [],
    value_profile_ids: [],
  },
  narrative_edges: {
    visibility: 'private',
    from_node_id: '__SETUP_NODE_A__',
    to_node_id: '__SETUP_NODE_B__',
    relation_type: 'causes',
    evidence_memory_ids: [],
    belief_ids: [],
    lesson_ids: [],
  },
  external_attachments: {
    visibility: 'private',
    label: 'Notaire',
    url: 'https://notaire.example/doc',
    type: 'document',
    notes: 'Dossier principal',
  },
};

const patchPayloadByResource: Record<DataResource, Record<string, unknown>> = {
  memories: { title: 'My updated memory' },
  beliefs: { statement: 'Learning deeply matters' },
  lessons: { lesson_text: 'Always verify and test' },
  value_profiles: { profile_label: 'Updated values' },
  beneficiaries: { identity: 'Updated beneficiary' },
  legacy_messages: { title: 'Updated final note' },
  narrative_nodes: { label: 'Updated key event' },
  narrative_edges: { relation_type: 'supports' },
  external_attachments: { notes: 'Note mise à jour' },
};

const registerAndLogin = async (app: CapsuleApiApp, email: string, password: string, ip: string) => {
  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email, password },
    headers: { 'x-forwarded-for': ip },
  });

  assert(register.status === 201, 'register should return 201');
  const body = register.body as { user: { id: string }; session: { token: string } };
  return { userId: body.user.id, token: body.session.token };
};

const runPaginationAndSortingTests = async (app: CapsuleApiApp, owner: { userId: string; token: string }): Promise<void> => {
  const memoryPayloads = [
    {
      visibility: 'private',
      occurred_at: '2024-03-01T10:00:00.000Z',
      title: 'March memory',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
    {
      visibility: 'private',
      occurred_at: '2024-01-15T10:00:00.000Z',
      title: 'January memory',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
    {
      visibility: 'private',
      occurred_at: '2024-02-01T10:00:00.000Z',
      title: 'February memory',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
  ];

  for (const payload of memoryPayloads) {
    const created = await app.handle({
      method: 'POST',
      path: '/data/memories',
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
      body: payload,
    });
    assert(created.status === 201, 'pagination setup should create memory');
  }

  const firstPage = await app.handle({
    method: 'GET',
    path: `/data/memories?owner_id=${owner.userId}&limit=2`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(firstPage.status === 200, 'first paginated page should return 200');
  const page1 = firstPage.body as PaginatedResponse<{ id: string; occurred_at: string }>;
  assert(page1.items.length === 2, 'page1 should contain 2 memories');
  assert(page1.total >= 3, 'page1 should report total items');
  assert(page1.items[0]?.occurred_at >= page1.items[1]?.occurred_at, 'default order should be descending chronologically');

  const secondPage = await app.handle({
    method: 'GET',
    path: `/data/memories?owner_id=${owner.userId}&limit=2&offset=2`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(secondPage.status === 200, 'second paginated page should return 200');
  const page2 = secondPage.body as PaginatedResponse<{ id: string; occurred_at: string }>;
  assert(page2.items.length >= 1, 'page2 should contain remaining memories');

  const combinedIds = [...page1.items, ...page2.items].map((item) => item.id);
  const uniqueIds = new Set(combinedIds);
  assert(combinedIds.length === uniqueIds.size, 'pagination should be stable without duplicates between pages');

  const cursorPage = await app.handle({
    method: 'GET',
    path: `/data/memories?owner_id=${owner.userId}&limit=1&cursor=1&sort=occurred_at&order=asc`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(cursorPage.status === 200, 'cursor pagination should return 200');
  const cursorBody = cursorPage.body as PaginatedResponse<{ occurred_at: string }>;
  assert(cursorBody.offset === 1, 'cursor should map to offset');

  const deterministicOrder = await app.handle({
    method: 'GET',
    path: `/data/beliefs?owner_id=${owner.userId}&sort=created_at&order=asc`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(deterministicOrder.status === 200, 'deterministic order query should return 200');

  const invalidLimit = await app.handle({
    method: 'GET',
    path: `/data/memories?owner_id=${owner.userId}&limit=1000`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(invalidLimit.status === 400, 'invalid limit should return 400');

  const invalidSort = await app.handle({
    method: 'GET',
    path: `/data/lessons?owner_id=${owner.userId}&sort=occurred_at`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(invalidSort.status === 400, 'invalid sort should return 400');

  const invalidOrder = await app.handle({
    method: 'GET',
    path: `/data/value_profiles?owner_id=${owner.userId}&order=sideways`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(invalidOrder.status === 400, 'invalid order should return 400');
};



const runLegacyMessageOrchestrationScenarios = async (app: CapsuleApiApp, owner: { userId: string; token: string }): Promise<void> => {
  await grantConsent(app, owner, 'post_mortem_transmission');
  const beneficiaryResponse = await app.handle({
    method: 'POST',
    path: '/data/beneficiaries',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      visibility: 'private',
      identity: 'Scenario recipient',
      channel: 'email',
      contact: 'scenario@example.com',
      verification_status: 'verified',
      status: 'active',
    },
  });
  assert(beneficiaryResponse.status === 201, 'legacy orchestration setup should create beneficiary');
  const beneficiaryId = (beneficiaryResponse.body as { id: string }).id;
  const createResponse = await app.handle({
    method: 'POST',
    path: '/data/legacy_messages',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      ...createPayloadByResource.legacy_messages,
      beneficiary_ids: [beneficiaryId],
      title: 'Scenario message',
      message: 'Ready to send',
      state: 'draft',
    },
  });
  assert(createResponse.status === 201, 'legacy orchestration setup should create message');
  const messageId = (createResponse.body as { id: string }).id;

  const armResponse = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${messageId}/arm`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(armResponse.status === 200, 'arm should return 200');

  const firstTrigger = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${messageId}/trigger`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(firstTrigger.status === 200, 'first trigger should return 200');

  const secondTrigger = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${messageId}/trigger`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(secondTrigger.status === 400, 'double trigger should be rejected');

  const lateRevoke = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${messageId}/revoke`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(lateRevoke.status === 400, 'late revoke after trigger should be rejected');

  const createFailureResponse = await app.handle({
    method: 'POST',
    path: '/data/legacy_messages',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      ...createPayloadByResource.legacy_messages,
      beneficiary_ids: [beneficiaryId],
      title: 'Failure message',
      message: '[FAIL_DELIVERY] force error',
      state: 'draft',
    },
  });
  assert(createFailureResponse.status === 201, 'failure setup should create message');
  const failureMessageId = (createFailureResponse.body as { id: string }).id;

  const failureArm = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${failureMessageId}/arm`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(failureArm.status === 200, 'failure message arm should return 200');

  const failureTrigger = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${failureMessageId}/trigger`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(failureTrigger.status === 200, 'failure message trigger should return 200');

  const deliveryResponse = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${failureMessageId}/deliver`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {},
  });
  assert(deliveryResponse.status === 200, 'delivery endpoint should return 200 even on delivery failure');
  const deliveryBody = deliveryResponse.body as { message: { state: string }; attempt: { status: string; attempted_at: string } };
  assert(deliveryBody.message.state === 'failed', 'delivery failure should switch state to failed');
  assert(deliveryBody.attempt.status === 'failed', 'delivery failure should create failed attempt');
  assert(typeof deliveryBody.attempt.attempted_at === 'string', 'delivery attempt should be timestamped');

  const attemptsResponse = await app.handle({
    method: 'GET',
    path: `/legacy-messages/${failureMessageId}/delivery-attempts?owner_id=${owner.userId}`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(attemptsResponse.status === 200, 'attempts listing should return 200');
  const attempts = attemptsResponse.body as Array<{ status: string; attempted_at: string }>;
  assert(attempts.length >= 1, 'attempt log should contain at least one record');
  assert(attempts.some((attempt) => attempt.status === 'failed'), 'attempt log should include failed record');

  const observabilityAudit = await app.handle({
    method: 'GET',
    path: '/observability/audit',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(observabilityAudit.status === 200, 'observability audit endpoint should expose sensitive orchestration events');
  const entries = (observabilityAudit.body as { entries: Array<{ event_name: string }> }).entries;
  assert(entries.some((entry) => entry.event_name === 'audit.legacy_message.armed'), 'arming action should be traced in audit events');
  assert(entries.some((entry) => entry.event_name === 'audit.legacy_message.trigger_requested'), 'trigger request should be traced in audit events');
  assert(entries.some((entry) => entry.event_name === 'audit.legacy_message.triggered'), 'effective trigger should be traced in audit events');
};

const runLinkIntegrityDeletionScenarios = async (app: CapsuleApiApp, owner: { userId: string; token: string }): Promise<void> => {
  const createMemoryResponse = await app.handle({
    method: 'POST',
    path: '/data/memories',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      ...createPayloadByResource.memories,
      title: 'Memory protected by links',
    },
  });
  assert(createMemoryResponse.status === 201, 'link integrity setup should create memory');
  const memoryId = (createMemoryResponse.body as { id: string }).id;

  const createValueProfileResponse = await app.handle({
    method: 'POST',
    path: '/data/value_profiles',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      ...createPayloadByResource.value_profiles,
      profile_label: 'Linked values',
      evidence_memory_ids: [memoryId],
    },
  });
  assert(createValueProfileResponse.status === 201, 'link integrity setup should create value profile');
  const valueProfileId = (createValueProfileResponse.body as { id: string }).id;

  const createLessonResponse = await app.handle({
    method: 'POST',
    path: '/data/lessons',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      ...createPayloadByResource.lessons,
      title: 'Linked lesson',
      source_memory_ids: [memoryId],
      linked_value_profile_ids: [valueProfileId],
    },
  });
  assert(createLessonResponse.status === 201, 'link integrity setup should create lesson');
  const lessonId = (createLessonResponse.body as { id: string }).id;

  const createBeliefResponse = await app.handle({
    method: 'POST',
    path: '/data/beliefs',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      ...createPayloadByResource.beliefs,
      belief_key: 'linked-belief',
      evidence_memory_ids: [memoryId],
      related_lesson_ids: [lessonId],
    },
  });
  assert(createBeliefResponse.status === 201, 'link integrity setup should create belief');
  const beliefId = (createBeliefResponse.body as { id: string }).id;

  const linkMemoryResponse = await app.handle({
    method: 'PATCH',
    path: `/data/memories/${memoryId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      related_belief_ids: [beliefId],
      related_lesson_ids: [lessonId],
      related_value_profile_ids: [valueProfileId],
    },
  });
  assert(linkMemoryResponse.status === 200, 'link integrity setup should update memory links');

  const blockedMemoryDelete = await app.handle({
    method: 'DELETE',
    path: `/data/memories/${memoryId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(blockedMemoryDelete.status === 400, 'memory delete should fail while linked');

  const blockedBeliefDelete = await app.handle({
    method: 'DELETE',
    path: `/data/beliefs/${beliefId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(blockedBeliefDelete.status === 400, 'belief delete should fail while linked');

  const blockedLessonDelete = await app.handle({
    method: 'DELETE',
    path: `/data/lessons/${lessonId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(blockedLessonDelete.status === 400, 'lesson delete should fail while linked');

  const blockedValueDelete = await app.handle({
    method: 'DELETE',
    path: `/data/value_profiles/${valueProfileId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(blockedValueDelete.status === 400, 'value profile delete should fail while linked');

  const unlinkMemory = await app.handle({
    method: 'PATCH',
    path: `/data/memories/${memoryId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
    },
  });
  assert(unlinkMemory.status === 200, 'memory unlink should succeed');

  const unlinkBelief = await app.handle({
    method: 'PATCH',
    path: `/data/beliefs/${beliefId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      evidence_memory_ids: [],
      related_lesson_ids: [],
    },
  });
  assert(unlinkBelief.status === 200, 'belief unlink should succeed');

  const unlinkLesson = await app.handle({
    method: 'PATCH',
    path: `/data/lessons/${lessonId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      source_memory_ids: [],
      linked_value_profile_ids: [],
    },
  });
  assert(unlinkLesson.status === 200, 'lesson unlink should succeed');

  const unlinkValue = await app.handle({
    method: 'PATCH',
    path: `/data/value_profiles/${valueProfileId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      evidence_memory_ids: [],
    },
  });
  assert(unlinkValue.status === 200, 'value profile unlink should succeed');

  const deletedBelief = await app.handle({
    method: 'DELETE',
    path: `/data/beliefs/${beliefId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deletedBelief.status === 204, 'belief delete should succeed after unlink');

  const deletedLesson = await app.handle({
    method: 'DELETE',
    path: `/data/lessons/${lessonId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deletedLesson.status === 204, 'lesson delete should succeed after unlink');

  const deletedValue = await app.handle({
    method: 'DELETE',
    path: `/data/value_profiles/${valueProfileId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deletedValue.status === 204, 'value profile delete should succeed after unlink');

  const deletedMemory = await app.handle({
    method: 'DELETE',
    path: `/data/memories/${memoryId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deletedMemory.status === 204, 'memory delete should succeed after unlink');
};

export const runDataIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const owner = await registerAndLogin(app, 'data-owner@example.com', 'Secret123!', '203.0.113.21');
  const outsider = await registerAndLogin(app, 'data-outsider@example.com', 'Secret123!', '203.0.113.22');

  const resources: DataResource[] = ['memories', 'beliefs', 'lessons', 'value_profiles', 'legacy_messages', 'beneficiaries', 'narrative_nodes', 'external_attachments'];

  for (const resource of resources) {
    const body = JSON.parse(JSON.stringify(createPayloadByResource[resource])) as Record<string, unknown>;
    if (resource === 'legacy_messages') {
      const beneficiary = await app.handle({
        method: 'POST',
        path: '/data/beneficiaries',
        headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
        body: {
          visibility: 'private',
          identity: 'Loop recipient',
          channel: 'email',
          contact: 'loop@example.com',
          verification_status: 'verified',
          status: 'active',
        },
      });
      assert(beneficiary.status === 201, 'legacy setup should create a beneficiary');
      body.beneficiary_ids = [(beneficiary.body as { id: string }).id];
    }

    const createdResponse = await app.handle({
      method: 'POST',
      path: `/data/${resource}`,
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
      body,
    });

    assert(createdResponse.status === 201, `${resource}: create should return 201`);
    const createdEntity = createdResponse.body as { id: string; owner_id: string };
    assert(createdEntity.owner_id === owner.userId, `${resource}: create should enforce owner_id`);

    const listedByOwner = await app.handle({
      method: 'GET',
      path: `/data/${resource}?owner_id=${owner.userId}`,
      headers: { authorization: `Bearer ${owner.token}` },
    });
    assert(listedByOwner.status === 200, `${resource}: list should return 200`);
    const ownerList = listedByOwner.body as PaginatedResponse<{ id: string }>;
    assert(ownerList.items.some((entry) => entry.id === createdEntity.id), `${resource}: owner should see created record`);

    const outsiderList = await app.handle({
      method: 'GET',
      path: `/data/${resource}`,
      headers: { authorization: `Bearer ${outsider.token}`, 'x-owner-id': outsider.userId },
    });
    assert(outsiderList.status === 200, `${resource}: outsider list should return 200`);
    const outsiderEntries = outsiderList.body as PaginatedResponse<{ id: string }>;
    assert(!outsiderEntries.items.some((entry) => entry.id === createdEntity.id), `${resource}: list must be filtered by owner_id`);

    const forbiddenList = await app.handle({
      method: 'GET',
      path: `/data/${resource}`,
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': outsider.userId },
    });
    assert(forbiddenList.status === 403, `${resource}: owner mismatch should be forbidden`);

    const updatedResponse = await app.handle({
      method: 'PATCH',
      path: `/data/${resource}/${createdEntity.id}`,
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
      body: patchPayloadByResource[resource],
    });
    assert(updatedResponse.status === 200, `${resource}: update should return 200`);

    const deleteResponse = await app.handle({
      method: 'DELETE',
      path: `/data/${resource}/${createdEntity.id}`,
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    });
    assert(deleteResponse.status === 204, `${resource}: delete should return 204`);

    const afterDelete = await app.handle({
      method: 'GET',
      path: `/data/${resource}`,
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    });
    assert(afterDelete.status === 200, `${resource}: list after delete should return 200`);
    const afterDeleteEntries = afterDelete.body as PaginatedResponse<{ id: string }>;
    assert(!afterDeleteEntries.items.some((entry) => entry.id === createdEntity.id), `${resource}: deleted record should disappear`);
  }


  const firstEdgeNodeResponse = await app.handle({
    method: 'POST',
    path: '/data/narrative_nodes',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: createPayloadByResource.narrative_nodes,
  });
  assert(firstEdgeNodeResponse.status === 201, 'narrative_edges CRUD setup first node should return 201');

  const secondEdgeNodeResponse = await app.handle({
    method: 'POST',
    path: '/data/narrative_nodes',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: { ...createPayloadByResource.narrative_nodes, label: 'Edge setup node B' },
  });
  assert(secondEdgeNodeResponse.status === 201, 'narrative_edges CRUD setup second node should return 201');

  const firstEdgeNodeId = (firstEdgeNodeResponse.body as { id: string }).id;
  const secondEdgeNodeId = (secondEdgeNodeResponse.body as { id: string }).id;

  const edgeCrudCreateResponse = await app.handle({
    method: 'POST',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: { ...createPayloadByResource.narrative_edges, from_node_id: firstEdgeNodeId, to_node_id: secondEdgeNodeId },
  });
  assert(edgeCrudCreateResponse.status === 201, 'narrative_edges: create should return 201');
  const createdEdge = edgeCrudCreateResponse.body as { id: string; owner_id: string };
  assert(createdEdge.owner_id === owner.userId, 'narrative_edges: create should enforce owner_id');

  const listedEdgesByOwner = await app.handle({
    method: 'GET',
    path: `/data/narrative_edges?owner_id=${owner.userId}`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(listedEdgesByOwner.status === 200, 'narrative_edges: list should return 200');
  const edgeOwnerList = listedEdgesByOwner.body as PaginatedResponse<{ id: string }>;
  assert(edgeOwnerList.items.some((entry) => entry.id === createdEdge.id), 'narrative_edges: owner should see created record');

  const outsiderEdgeList = await app.handle({
    method: 'GET',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${outsider.token}`, 'x-owner-id': outsider.userId },
  });
  assert(outsiderEdgeList.status === 200, 'narrative_edges: outsider list should return 200');
  const outsiderEdgeEntries = outsiderEdgeList.body as PaginatedResponse<{ id: string }>;
  assert(!outsiderEdgeEntries.items.some((entry) => entry.id === createdEdge.id), 'narrative_edges: list must be filtered by owner_id');

  const forbiddenEdgeList = await app.handle({
    method: 'GET',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': outsider.userId },
  });
  assert(forbiddenEdgeList.status === 403, 'narrative_edges: owner mismatch should be forbidden');

  const updatedEdgeResponse = await app.handle({
    method: 'PATCH',
    path: `/data/narrative_edges/${createdEdge.id}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: patchPayloadByResource.narrative_edges,
  });
  assert(updatedEdgeResponse.status === 200, 'narrative_edges: update should return 200');

  const deleteEdgeResponse = await app.handle({
    method: 'DELETE',
    path: `/data/narrative_edges/${createdEdge.id}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deleteEdgeResponse.status === 204, 'narrative_edges: delete should return 204');

  const edgesAfterDelete = await app.handle({
    method: 'GET',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(edgesAfterDelete.status === 200, 'narrative_edges: list after delete should return 200');
  const edgesAfterDeleteEntries = edgesAfterDelete.body as PaginatedResponse<{ id: string }>;
  assert(!edgesAfterDeleteEntries.items.some((entry) => entry.id === createdEdge.id), 'narrative_edges: deleted record should disappear');



  await runLegacyMessageOrchestrationScenarios(app, owner);
  await runLinkIntegrityDeletionScenarios(app, owner);

  const firstNodeResponse = await app.handle({
    method: 'POST',
    path: '/data/narrative_nodes',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: createPayloadByResource.narrative_nodes,
  });
  assert(firstNodeResponse.status === 201, 'narrative_edges setup first node should return 201');
  const secondNodeResponse = await app.handle({
    method: 'POST',
    path: '/data/narrative_nodes',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: { ...createPayloadByResource.narrative_nodes, label: 'Second event node' },
  });
  assert(secondNodeResponse.status === 201, 'narrative_edges setup second node should return 201');

  const firstNodeId = (firstNodeResponse.body as { id: string }).id;
  const secondNodeId = (secondNodeResponse.body as { id: string }).id;

  const edgeCreateResponse = await app.handle({
    method: 'POST',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: { ...createPayloadByResource.narrative_edges, from_node_id: firstNodeId, to_node_id: secondNodeId },
  });
  assert(edgeCreateResponse.status === 201, 'narrative_edges: create should return 201');
  const edgeId = (edgeCreateResponse.body as { id: string }).id;

  const invalidEdge = await app.handle({
    method: 'POST',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: { ...createPayloadByResource.narrative_edges, from_node_id: firstNodeId, to_node_id: firstNodeId },
  });
  assert(invalidEdge.status === 400, 'narrative_edges: self-loop should be rejected');

  const standaloneEdgeUpdateResponse = await app.handle({
    method: 'PATCH',
    path: `/data/narrative_edges/${edgeId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: patchPayloadByResource.narrative_edges,
  });
  assert(standaloneEdgeUpdateResponse.status === 200, 'narrative_edges: update should return 200');

  const deleteEdge = await app.handle({
    method: 'DELETE',
    path: `/data/narrative_edges/${edgeId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deleteEdge.status === 204, 'narrative_edges: delete should return 204');


  await runPaginationAndSortingTests(app, owner);
};
const grantConsent = async (app: CapsuleApiApp, owner: { userId: string; token: string }, scope: 'data_export' | 'post_mortem_transmission' | 'posthumous_visibility'): Promise<void> => {
  const response = await app.handle({
    method: 'POST',
    path: '/consent/grant',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: { owner_id: owner.userId, scope, legal_basis: 'explicit_opt_in' },
  });
  assert(response.status === 201, `consent grant should return 201 for ${scope}`);
};
