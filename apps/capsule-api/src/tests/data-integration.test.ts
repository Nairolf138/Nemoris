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
  | 'narrative_nodes'
  | 'narrative_edges';

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
  legacy_messages: {
    visibility: 'private',
    title: 'Final note',
    message: 'Be kind',
    trigger_type: 'manual',
    recipient_ids: ['recipient-1'],
    attachment_memory_ids: [],
    related_belief_ids: [],
    related_lesson_ids: [],
    related_value_profile_ids: [],
    related_narrative_node_ids: [],
    delivery_status: 'draft',
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
};

const patchPayloadByResource: Record<DataResource, Record<string, unknown>> = {
  memories: { title: 'My updated memory' },
  beliefs: { statement: 'Learning deeply matters' },
  lessons: { lesson_text: 'Always verify and test' },
  value_profiles: { profile_label: 'Updated values' },
  legacy_messages: { title: 'Updated final note' },
  narrative_nodes: { label: 'Updated key event' },
  narrative_edges: { relation_type: 'supports' },
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

export const runDataIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const owner = await registerAndLogin(app, 'data-owner@example.com', 'Secret123!', '203.0.113.21');
  const outsider = await registerAndLogin(app, 'data-outsider@example.com', 'Secret123!', '203.0.113.22');

  const resources: DataResource[] = ['memories', 'beliefs', 'lessons', 'value_profiles', 'legacy_messages', 'narrative_nodes'];

  for (const resource of resources) {
    const createdResponse = await app.handle({
      method: 'POST',
      path: `/data/${resource}`,
      headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
      body: createPayloadByResource[resource],
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

  const updatedEdgeResponse = await app.handle({
    method: 'PATCH',
    path: `/data/narrative_edges/${edgeId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: patchPayloadByResource.narrative_edges,
  });
  assert(updatedEdgeResponse.status === 200, 'narrative_edges: update should return 200');

  const deleteEdge = await app.handle({
    method: 'DELETE',
    path: `/data/narrative_edges/${edgeId}`,
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
  });
  assert(deleteEdge.status === 204, 'narrative_edges: delete should return 204');


  await runPaginationAndSortingTests(app, owner);
};
