import { CapsuleApiApp } from '../app.js';

declare const Buffer: {
  from(input: string, encoding: 'base64'): { toString(encoding: 'utf8'): string };
};

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runExportIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'exporter@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.3' },
  });

  const token = (register.body as { session: { token: string } }).session.token;
  const ownerId = (register.body as { user: { id: string } }).user.id;

  const memoryTitle = 'Souvenir exportable';
  const messageTitle = 'Message exportable';

  const createdMemory = await app.handle({
    method: 'POST',
    path: '/data/memories',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: {
      visibility: 'private',
      occurred_at: '2024-01-01T10:00:00.000Z',
      title: memoryTitle,
      description: 'description export',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
  });
  assert(createdMemory.status === 201, 'memory setup should return 201');

  const createdMessage = await app.handle({
    method: 'POST',
    path: '/data/legacy_messages',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: {
      visibility: 'private',
      title: messageTitle,
      message: 'Ce message doit apparaître dans l’export.',
      trigger_type: 'manual',
      recipient_ids: ['recipient-1'],
      attachment_memory_ids: [],
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
      state: 'draft',
    },
  });
  assert(createdMessage.status === 201, 'legacy message setup should return 201');

  const denied = await app.handle({ method: 'POST', path: '/exports', body: { format: 'json', owner_id: ownerId } });
  assert(denied.status === 401, 'exports endpoint should require auth');

  const invalidFormat = await app.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${token}` },
    body: { format: 'xml', owner_id: ownerId },
  });
  assert(invalidFormat.status === 400, 'invalid export format should return 400');
  assert((invalidFormat.body as { error: string }).error === 'INVALID_EXPORT_FORMAT', 'invalid format should expose INVALID_EXPORT_FORMAT');

  const invalidOwnerScope = await app.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${token}` },
    body: { format: 'json', owner_id: '   ' },
  });
  assert(invalidOwnerScope.status === 400, 'invalid owner scope should return 400');
  assert(
    (invalidOwnerScope.body as { error: string }).error === 'INVALID_OWNER_SCOPE',
    'invalid owner scope should expose INVALID_OWNER_SCOPE',
  );

  const created = await app.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${token}` },
    body: { format: 'json', owner_id: ownerId },
  });

  assert(created.status === 201, 'export creation should return 201');
  const exportId = (created.body as { export_id: string }).export_id;

  const downloaded = await app.handle({
    method: 'GET',
    path: `/exports/${exportId}/download`,
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });

  assert(downloaded.status === 200, 'download should return 200');
  const payload = downloaded.body as { mime_type: string; content_base64: string };
  assert(payload.mime_type === 'application/json', 'download should be a JSON export');
  assert(payload.content_base64.length > 0, 'download should contain payload');

  const decoded = JSON.parse(Buffer.from(payload.content_base64, 'base64').toString('utf8')) as {
    memories: Array<{ title: string }>;
    legacy_messages: Array<{ title: string }>;
  };

  assert(decoded.memories.some((memory) => memory.title === memoryTitle), 'created memory should appear in export payload');
  assert(
    decoded.legacy_messages.some((message) => message.title === messageTitle),
    'created legacy message should appear in export payload',
  );

  const audit = await app.handle({
    method: 'GET',
    path: '/exports/audit',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });

  assert(audit.status === 200, 'audit route should return 200');
  const entries = (audit.body as { entries: Array<{ format: string }> }).entries;
  assert(entries.length === 1, 'audit should contain one entry');
  assert(entries[0]?.format === 'json', 'audit should keep the format');

  const observabilityAudit = await app.handle({
    method: 'GET',
    path: '/observability/audit',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });
  assert(observabilityAudit.status === 200, 'observability audit endpoint should return 200');

  const obsEntries = (observabilityAudit.body as { entries: Array<{ event_name: string }> }).entries;
  assert(obsEntries.some((entry) => entry.event_name === 'export.created'), 'export created event should be emitted');
  assert(obsEntries.some((entry) => entry.event_name === 'export.downloaded'), 'export downloaded event should be emitted');

  const dashboard = await app.handle({
    method: 'GET',
    path: '/observability/dashboard',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });

  assert(dashboard.status === 200, 'dashboard endpoint should return 200');
  const body = dashboard.body as { json: { metrics: { export_total: number; export_rate: number } }; csv: string };
  assert(body.json.metrics.export_total >= 1, 'dashboard should expose export total metric');
  assert(body.json.metrics.export_rate >= 0, 'dashboard should expose export rate metric');
  assert(body.csv.includes('export_total,'), 'dashboard csv should include export total metric');
  assert(body.csv.includes('export_rate,'), 'dashboard csv should include export rate metric');
};

export const runExportPersistenceIntegrationTests = async (): Promise<void> => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_EXPORT_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = `./tmp-export-auth-${unique}.sqlite`;
  runtimeEnv.CAPSULE_EXPORT_DB_PATH = `./tmp-export-data-${unique}.sqlite`;

  const firstInstance = new CapsuleApiApp();
  const register = await firstInstance.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'export-persist@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.55' },
  });

  assert(register.status === 201, 'register should succeed for export persistence test');
  const registerBody = register.body as { user: { id: string }; session: { token: string } };

  const createdExport = await firstInstance.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${registerBody.session.token}` },
    body: { format: 'json', owner_id: registerBody.user.id },
  });

  assert(createdExport.status === 201, 'export creation should succeed before restart');
  const exportId = (createdExport.body as { export_id: string }).export_id;

  const secondInstance = new CapsuleApiApp();
  const login = await secondInstance.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'export-persist@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.55' },
  });

  assert(login.status === 200, 'login should succeed after restart');
  const loginBody = login.body as { session: { token: string }; user: { id: string } };

  const downloaded = await secondInstance.handle({
    method: 'GET',
    path: `/exports/${exportId}/download`,
    headers: { authorization: `Bearer ${loginBody.session.token}`, 'x-owner-id': loginBody.user.id },
  });

  assert(downloaded.status === 200, 'export should be downloadable after restart');

  const audit = await secondInstance.handle({
    method: 'GET',
    path: '/exports/audit',
    headers: { authorization: `Bearer ${loginBody.session.token}`, 'x-owner-id': loginBody.user.id },
  });

  assert(audit.status === 200, 'audit should be available after restart');
  const entries = (audit.body as { entries: Array<{ export_id: string }> }).entries;
  assert(entries.some((entry) => entry.export_id === exportId), 'audit should contain export created before restart');

  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_EXPORT_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = undefined;
  runtimeEnv.CAPSULE_EXPORT_DB_PATH = undefined;
};
