import { CapsuleApiApp } from '../app.js';

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runPersistenceIntegrationTests = async (): Promise<void> => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = `./tmp-auth-${unique}.sqlite`;
  runtimeEnv.CAPSULE_DATA_DB_PATH = `./tmp-data-${unique}.sqlite`;

  const firstInstance = new CapsuleApiApp();
  const register = await firstInstance.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'persist@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '198.51.100.10' },
  });

  assert(register.status === 201, 'register should succeed');
  const registerBody = register.body as { user: { id: string }; session: { token: string } };

  const createdMemory = await firstInstance.handle({
    method: 'POST',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerBody.session.token}`, 'x-owner-id': registerBody.user.id },
    body: {
      visibility: 'private',
      occurred_at: '2024-01-01T10:00:00.000Z',
      title: 'Persisted memory',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
  });

  assert(createdMemory.status === 201, 'memory creation should succeed');
  const memoryId = (createdMemory.body as { id: string }).id;

  const secondInstance = new CapsuleApiApp();

  const sessionStillValid = await secondInstance.handle({
    method: 'GET',
    path: `/data/memories?owner_id=${registerBody.user.id}`,
    headers: { authorization: `Bearer ${registerBody.session.token}` },
  });

  assert(sessionStillValid.status === 200, 'session should survive app restart');
  const memoryList = sessionStillValid.body as Array<{ id: string }>;
  assert(memoryList.some((entry) => entry.id === memoryId), 'memory should survive app restart');

  const loginAfterRestart = await secondInstance.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'persist@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '198.51.100.10' },
  });

  assert(loginAfterRestart.status === 200, 'user should be recoverable after restart');

  const sqliteConcurrentRegisters = await Promise.all(
    Array.from({ length: 3 }, (_, index) =>
      secondInstance.handle({
        method: 'POST',
        path: '/auth/register',
        body: { email: `sqlite-burst-${index}@example.com`, password: 'Secret123!' },
        headers: { 'x-forwarded-for': `198.51.100.${40 + index}` },
      }),
    ),
  );
  assert(sqliteConcurrentRegisters.every((entry) => entry.status === 201), 'sqlite store should handle burst registration');

  const sqliteConcurrentLogins = await Promise.all(
    Array.from({ length: 3 }, (_, index) =>
      secondInstance.handle({
        method: 'POST',
        path: '/auth/login',
        body: { email: `sqlite-burst-${index}@example.com`, password: 'Secret123!' },
        headers: { 'x-forwarded-for': `198.51.100.${50 + index}` },
      }),
    ),
  );
  assert(sqliteConcurrentLogins.every((entry) => entry.status === 200), 'sqlite store should handle burst login');

  const sqliteSessionToken = (sqliteConcurrentLogins[0]?.body as { session: { token: string } }).session.token;
  const sqliteRefresh = await secondInstance.handle({
    method: 'POST',
    path: '/auth/refresh',
    headers: { authorization: `Bearer ${sqliteSessionToken}`, 'x-forwarded-for': '198.51.100.60' },
  });
  assert(sqliteRefresh.status === 200, 'sqlite refresh should return a new token');
  const sqliteRefreshedToken = (sqliteRefresh.body as { session: { token: string } }).session.token;

  const sqliteOldTokenDenied = await secondInstance.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${sqliteSessionToken}` },
  });
  assert(sqliteOldTokenDenied.status === 401, 'old sqlite token should be revoked after refresh');

  const sqliteLogout = await secondInstance.handle({
    method: 'POST',
    path: '/auth/logout',
    headers: { authorization: `Bearer ${sqliteRefreshedToken}`, 'x-forwarded-for': '198.51.100.60' },
  });
  assert(sqliteLogout.status === 204, 'sqlite logout should succeed for refreshed token');

  const sqliteRevokedDenied = await secondInstance.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${sqliteRefreshedToken}` },
  });
  assert(sqliteRevokedDenied.status === 401, 'sqlite revoked token should be denied');

  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = undefined;
  runtimeEnv.CAPSULE_DATA_DB_PATH = undefined;
};
