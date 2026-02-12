import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

type DataResource = 'memories' | 'beliefs' | 'lessons' | 'value_profiles' | 'legacy_messages';

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
};

const patchPayloadByResource: Record<DataResource, Record<string, unknown>> = {
  memories: { title: 'My updated memory' },
  beliefs: { statement: 'Learning deeply matters' },
  lessons: { lesson_text: 'Always verify and test' },
  value_profiles: { profile_label: 'Updated values' },
  legacy_messages: { title: 'Updated final note' },
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

export const runDataIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const owner = await registerAndLogin(app, 'data-owner@example.com', 'Secret123!', '203.0.113.21');
  const outsider = await registerAndLogin(app, 'data-outsider@example.com', 'Secret123!', '203.0.113.22');

  const resources: DataResource[] = ['memories', 'beliefs', 'lessons', 'value_profiles', 'legacy_messages'];

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
    const ownerList = listedByOwner.body as Array<{ id: string }>;
    assert(ownerList.some((entry) => entry.id === createdEntity.id), `${resource}: owner should see created record`);

    const outsiderList = await app.handle({
      method: 'GET',
      path: `/data/${resource}`,
      headers: { authorization: `Bearer ${outsider.token}`, 'x-owner-id': outsider.userId },
    });
    assert(outsiderList.status === 200, `${resource}: outsider list should return 200`);
    const outsiderEntries = outsiderList.body as Array<{ id: string }>;
    assert(!outsiderEntries.some((entry) => entry.id === createdEntity.id), `${resource}: list must be filtered by owner_id`);

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
    const afterDeleteEntries = afterDelete.body as Array<{ id: string }>;
    assert(!afterDeleteEntries.some((entry) => entry.id === createdEntity.id), `${resource}: deleted record should disappear`);
  }
};
