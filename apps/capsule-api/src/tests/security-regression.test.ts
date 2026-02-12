import { execFileSync } from 'node:child_process';
import { CapsuleApiApp } from '../app.js';

type RuntimeEnv = Record<string, string | undefined>;
const runtimeEnv: RuntimeEnv = ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runSecurityRegressionTests = async (): Promise<void> => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_EXPORT_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = `./tmp-auth-security-${unique}.sqlite`;
  runtimeEnv.CAPSULE_DATA_DB_PATH = `./tmp-data-security-${unique}.sqlite`;
  runtimeEnv.CAPSULE_EXPORT_DB_PATH = `./tmp-export-security-${unique}.sqlite`;
  runtimeEnv.CAPSULE_DATA_ENCRYPTION_STRATEGY = 'aes-256-gcm';

  const app = new CapsuleApiApp();
  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'security@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '198.51.100.70' },
  });
  assert(register.status === 201, 'register should succeed');
  const registerBody = register.body as { user: { id: string }; session: { token: string } };

  const forged = `${registerBody.session.token.slice(0, -1)}x`;
  const forgedResult = await app.handle({ method: 'GET', path: '/data/memories', headers: { authorization: `Bearer ${forged}` } });
  assert(forgedResult.status === 401, 'forged token must be rejected');

  const refresh = await app.handle({ method: 'POST', path: '/auth/refresh', headers: { authorization: `Bearer ${registerBody.session.token}` } });
  assert(refresh.status === 200, 'refresh should succeed');
  const replay = await app.handle({ method: 'POST', path: '/auth/refresh', headers: { authorization: `Bearer ${registerBody.session.token}` } });
  assert(replay.status === 401, 'replay of refreshed token must fail');

  const createMemory = await app.handle({
    method: 'POST',
    path: '/data/memories',
    headers: { authorization: `Bearer ${(refresh.body as { session: { token: string } }).session.token}`, 'x-owner-id': registerBody.user.id },
    body: {
      visibility: 'private',
      occurred_at: '2024-01-01T10:00:00.000Z',
      title: 'Highly sensitive title',
      description: 'Top secret memory',
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
    },
  });
  assert(createMemory.status === 201, 'memory creation should succeed');

  const rawPayload = execFileSync('sqlite3', [runtimeEnv.CAPSULE_DATA_DB_PATH as string, "SELECT payload FROM memories LIMIT 1;"], { encoding: 'utf8' });
  assert(!rawPayload.includes('Highly sensitive title'), 'plaintext sensitive payload must not be readable in DB');

  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_EXPORT_STORE_BACKEND = 'memory';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = undefined;
  runtimeEnv.CAPSULE_DATA_DB_PATH = undefined;
  runtimeEnv.CAPSULE_EXPORT_DB_PATH = undefined;
};
