import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const registerAndLogin = async (app: CapsuleApiApp, email: string, ip: string) => {
  const response = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email, password: 'Secret123!' },
    headers: { 'x-forwarded-for': ip },
  });
  assert(response.status === 201, 'register should return 201');
  const body = response.body as { user: { id: string }; session: { token: string } };
  return { userId: body.user.id, token: body.session.token };
};

export const runNarrativeIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const owner = await registerAndLogin(app, 'narrative-owner@example.com', '203.0.113.30');
  const outsider = await registerAndLogin(app, 'narrative-outsider@example.com', '203.0.113.31');

  const memory = await app.handle({
    method: 'POST',
    path: '/data/memories',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      visibility: 'private',
      occurred_at: '2024-01-01T10:00:00.000Z',
      title: 'Narrative source',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
  });
  assert(memory.status === 201, 'memory setup should return 201');
  const memoryId = (memory.body as { id: string }).id;

  const ownerNode = await app.handle({
    method: 'POST',
    path: '/data/narrative_nodes',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      visibility: 'private',
      node_type: 'event',
      label: 'Owner node',
      memory_ids: [memoryId],
      belief_ids: [],
      lesson_ids: [],
      value_profile_ids: [],
    },
  });
  assert(ownerNode.status === 201, 'owner narrative node should be created');
  const ownerNodeId = (ownerNode.body as { id: string }).id;

  const outsiderNode = await app.handle({
    method: 'POST',
    path: '/data/narrative_nodes',
    headers: { authorization: `Bearer ${outsider.token}`, 'x-owner-id': outsider.userId },
    body: {
      visibility: 'private',
      node_type: 'event',
      label: 'Outsider node',
      memory_ids: [],
      belief_ids: [],
      lesson_ids: [],
      value_profile_ids: [],
    },
  });
  assert(outsiderNode.status === 201, 'outsider narrative node should be created');
  const outsiderNodeId = (outsiderNode.body as { id: string }).id;

  const crossOwnerNodeRef = await app.handle({
    method: 'POST',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      visibility: 'private',
      from_node_id: ownerNodeId,
      to_node_id: outsiderNodeId,
      relation_type: 'influences',
      evidence_memory_ids: [],
      belief_ids: [],
      lesson_ids: [],
    },
  });
  assert(crossOwnerNodeRef.status === 403, 'cross-owner edge references should be forbidden');

  const unknownNodeRef = await app.handle({
    method: 'POST',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      visibility: 'private',
      from_node_id: ownerNodeId,
      to_node_id: 'missing-node-id',
      relation_type: 'supports',
      evidence_memory_ids: [],
      belief_ids: [],
      lesson_ids: [],
    },
  });
  assert(unknownNodeRef.status === 400, 'missing node references should return 400');

  const edge = await app.handle({
    method: 'POST',
    path: '/data/narrative_edges',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      visibility: 'private',
      from_node_id: ownerNodeId,
      to_node_id: ownerNodeId,
      relation_type: 'supports',
      evidence_memory_ids: [memoryId],
      belief_ids: [],
      lesson_ids: [],
    },
  });
  assert(edge.status === 400, 'from_node_id and to_node_id must differ');
};
