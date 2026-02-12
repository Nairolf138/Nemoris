import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  createBelief,
  createInMemoryPersistence,
  createLegacyMessage,
  createLesson,
  createMemory,
  createValueProfile,
  deleteMemory,
  listMemories,
  updateLegacyMessage,
  updateMemory,
} from '../dist/index.js';

const owner_id = 'owner-1';

const makeDeps = async () => {
  const persistence = createInMemoryPersistence();
  const now = new Date().toISOString();

  await persistence.memories.create({
    id: 'mem-ref', owner_id, visibility: 'private', created_at: now, updated_at: now,
    occurred_at: now, title: 'Ref memory', description: 'seed', memory_type: 'note',
    related_belief_ids: [], related_lesson_ids: [], related_value_profile_ids: [], related_narrative_node_ids: [],
  });

  await persistence.narrativeNodes.create({
    id: 'node-ref', owner_id, visibility: 'private', created_at: now, updated_at: now,
    node_type: 'event', label: 'Seed node', memory_ids: [], belief_ids: [], lesson_ids: [], value_profile_ids: [],
  });

  await persistence.valueProfiles.create({
    id: 'vp-ref', owner_id, visibility: 'private', created_at: now, updated_at: now,
    profile_label: 'Seed profile', values: [{ value_id: 'v1', label: 'Empathy', score: 50 }],
    current_version_number: 1, evidence_memory_ids: ['mem-ref'], narrative_node_ids: ['node-ref'],
  });

  await persistence.lessons.create({
    id: 'lesson-ref', owner_id, visibility: 'private', created_at: now, updated_at: now,
    title: 'Lesson seed', lesson_text: 'Always validate inputs.', severity: 'medium',
    source_memory_ids: ['mem-ref'], linked_belief_ids: [], linked_value_profile_ids: ['vp-ref'],
  });

  await persistence.beliefs.create({
    id: 'belief-ref', owner_id, visibility: 'private', created_at: now, updated_at: now,
    belief_key: 'seed', statement: 'Seeds are useful.', status: 'active', current_version_number: 1,
    evidence_memory_ids: ['mem-ref'], related_lesson_ids: ['lesson-ref'],
  });

  return persistence;
};

test('memory use-cases: create/update/list/delete', async () => {
  const persistence = await makeDeps();
  const deps = {
    memoryRepository: persistence.memories,
    beliefRepository: persistence.beliefs,
    lessonRepository: persistence.lessons,
    valueProfileRepository: persistence.valueProfiles,
    narrativeNodeRepository: persistence.narrativeNodes,
  };

  const created = await createMemory(deps, {
    owner_id, visibility: 'private', occurred_at: new Date().toISOString(), title: 'A useful memory', memory_type: 'event',
    related_belief_ids: ['belief-ref'], related_lesson_ids: ['lesson-ref'], related_value_profile_ids: ['vp-ref'], related_narrative_node_ids: ['node-ref'],
  });

  const updated = await updateMemory(deps, created.id, { title: 'Updated title' });
  const listed = await listMemories({ memoryRepository: persistence.memories }, owner_id);
  const deleted = await deleteMemory(deps, created.id);

  assert.equal(updated?.title, 'Updated title');
  assert.ok(listed.length >= 2);
  assert.equal(deleted, true);
});

test('memory validation rejects unknown related ids', async () => {
  const persistence = await makeDeps();

  await assert.rejects(
    () => createMemory({
      memoryRepository: persistence.memories,
      beliefRepository: persistence.beliefs,
      lessonRepository: persistence.lessons,
      valueProfileRepository: persistence.valueProfiles,
      narrativeNodeRepository: persistence.narrativeNodes,
    }, {
      owner_id, visibility: 'private', occurred_at: new Date().toISOString(), title: 'Invalid memory',
      related_belief_ids: ['missing-belief'], related_lesson_ids: [], related_value_profile_ids: [], related_narrative_node_ids: [],
    }),
    ValidationError,
  );
});

test('other entities create successfully with consistent relations', async () => {
  const persistence = await makeDeps();

  const belief = await createBelief({
    beliefRepository: persistence.beliefs, memoryRepository: persistence.memories, lessonRepository: persistence.lessons,
  }, {
    owner_id, visibility: 'private', belief_key: 'growth', statement: 'We can grow over time.', status: 'active',
    current_version_number: 1, evidence_memory_ids: ['mem-ref'], related_lesson_ids: ['lesson-ref'], previous_belief_id: 'belief-ref',
  });

  const lesson = await createLesson({
    lessonRepository: persistence.lessons, memoryRepository: persistence.memories, beliefRepository: persistence.beliefs, valueProfileRepository: persistence.valueProfiles,
  }, {
    owner_id, visibility: 'private', title: 'Link belief and profile', lesson_text: 'Connect the dots.',
    source_memory_ids: ['mem-ref'], linked_belief_ids: ['belief-ref'], linked_value_profile_ids: ['vp-ref'],
  });

  const valueProfile = await createValueProfile({
    valueProfileRepository: persistence.valueProfiles, memoryRepository: persistence.memories, narrativeNodeRepository: persistence.narrativeNodes,
  }, {
    owner_id, visibility: 'private', profile_label: 'Mature values', values: [{ value_id: 'v2', label: 'Responsibility', score: 80 }],
    current_version_number: 1, evidence_memory_ids: ['mem-ref'], narrative_node_ids: ['node-ref'],
  });

  const legacyMessage = await createLegacyMessage({
    legacyMessageRepository: persistence.legacyMessages,
    memoryRepository: persistence.memories,
    beliefRepository: persistence.beliefs,
    lessonRepository: persistence.lessons,
    valueProfileRepository: persistence.valueProfiles,
    narrativeNodeRepository: persistence.narrativeNodes,
  }, {
    owner_id,
    visibility: 'private',
    title: 'Legacy draft',
    message: 'Remember what mattered.',
    trigger_type: 'manual',
    recipient_ids: ['recipient-1'],
    attachment_memory_ids: ['mem-ref'],
    related_belief_ids: ['belief-ref'],
    related_lesson_ids: ['lesson-ref'],
    related_value_profile_ids: ['vp-ref'],
    related_narrative_node_ids: ['node-ref'],
    delivery_status: 'draft',
  });

  assert.equal(belief.previous_belief_id, 'belief-ref');
  assert.equal(lesson.title, 'Link belief and profile');
  assert.equal(valueProfile.profile_label, 'Mature values');
  assert.equal(legacyMessage.delivery_status, 'draft');
});


test('observability emits required sensitive CRUD and legacy message arm/revoke events', async () => {
  const persistence = await makeDeps();
  const events = [];
  const observer = {
    emitEvent: (event) => events.push(event),
  };

  const deps = {
    memoryRepository: persistence.memories,
    beliefRepository: persistence.beliefs,
    lessonRepository: persistence.lessons,
    valueProfileRepository: persistence.valueProfiles,
    narrativeNodeRepository: persistence.narrativeNodes,
    observer,
  };

  const memory = await createMemory(deps, {
    owner_id,
    visibility: 'private',
    occurred_at: new Date().toISOString(),
    title: 'Tracked memory',
    memory_type: 'note',
    related_belief_ids: ['belief-ref'],
    related_lesson_ids: ['lesson-ref'],
    related_value_profile_ids: ['vp-ref'],
    related_narrative_node_ids: ['node-ref'],
  });

  await updateMemory(deps, memory.id, { title: 'Tracked memory v2' });
  await deleteMemory(deps, memory.id);

  const legacy = await createLegacyMessage({
    legacyMessageRepository: persistence.legacyMessages,
    memoryRepository: persistence.memories,
    beliefRepository: persistence.beliefs,
    lessonRepository: persistence.lessons,
    valueProfileRepository: persistence.valueProfiles,
    narrativeNodeRepository: persistence.narrativeNodes,
    observer,
  }, {
    owner_id,
    visibility: 'private',
    title: 'Legacy tracked',
    message: 'Message to arm and revoke.',
    trigger_type: 'manual',
    recipient_ids: ['recipient-1'],
    attachment_memory_ids: ['mem-ref'],
    related_belief_ids: ['belief-ref'],
    related_lesson_ids: ['lesson-ref'],
    related_value_profile_ids: ['vp-ref'],
    related_narrative_node_ids: ['node-ref'],
    delivery_status: 'draft',
  });

  await updateLegacyMessage({
    legacyMessageRepository: persistence.legacyMessages,
    memoryRepository: persistence.memories,
    beliefRepository: persistence.beliefs,
    lessonRepository: persistence.lessons,
    valueProfileRepository: persistence.valueProfiles,
    narrativeNodeRepository: persistence.narrativeNodes,
    observer,
  }, legacy.id, { delivery_status: 'armed' });

  await updateLegacyMessage({
    legacyMessageRepository: persistence.legacyMessages,
    memoryRepository: persistence.memories,
    beliefRepository: persistence.beliefs,
    lessonRepository: persistence.lessons,
    valueProfileRepository: persistence.valueProfiles,
    narrativeNodeRepository: persistence.narrativeNodes,
    observer,
  }, legacy.id, { delivery_status: 'revoked' });

  assert.ok(events.some((event) => event.event_name === 'capsule.created'));
  assert.ok(events.some((event) => event.event_name === 'memory.updated'));
  assert.ok(events.some((event) => event.event_name === 'memory.deleted'));
  assert.ok(events.some((event) => event.event_name === 'legacy_message.armed'));
  assert.ok(events.some((event) => event.event_name === 'legacy_message.revoked'));
});
