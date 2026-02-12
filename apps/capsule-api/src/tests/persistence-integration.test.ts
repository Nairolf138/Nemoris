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
    body: { email: 'persist@example.com', password: 'secret123' },
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
    body: { email: 'persist@example.com', password: 'secret123' },
    headers: { 'x-forwarded-for': '198.51.100.10' },
  });

  assert(loginAfterRestart.status === 200, 'user should be recoverable after restart');

  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = undefined;
  runtimeEnv.CAPSULE_DATA_DB_PATH = undefined;
};
