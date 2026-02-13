import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CapsuleApiApp } from '../app.js';

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const backupScriptPath = resolve(repoRoot, 'scripts/persistence-backup.mjs');

const runBackupScript = (action: 'backup' | 'restore', dir: string): void => {
  execFileSync('node', [backupScriptPath, action, '--dir', dir], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
};

export const runPersistenceIntegrationTests = async (): Promise<void> => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const authDbPath = resolve(repoRoot, `.tmp-auth-${unique}.sqlite`);
  const dataDbPath = resolve(repoRoot, `.tmp-data-${unique}.sqlite`);
  const exportDbPath = resolve(repoRoot, `.tmp-export-${unique}.sqlite`);
  const backupDir = resolve(repoRoot, `.tmp-backup-${unique}`);

  runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_EXPORT_STORE_BACKEND = 'sqlite';
  runtimeEnv.CAPSULE_AUTH_DB_PATH = authDbPath;
  runtimeEnv.CAPSULE_DATA_DB_PATH = dataDbPath;
  runtimeEnv.CAPSULE_EXPORT_DB_PATH = exportDbPath;

  try {
    const firstInstance = new CapsuleApiApp();
    const register = await firstInstance.handle({
      method: 'POST',
      path: '/auth/register',
      body: { email: 'persist@example.com', password: 'Secret123!' },
      headers: { 'x-forwarded-for': '198.51.100.10' },
    });
    assert(register.status === 201, 'register should succeed');

    const registerBody = register.body as { user: { id: string }; session: { token: string } };

    const firstMemory = await firstInstance.handle({
      method: 'POST',
      path: '/data/memories',
      headers: { authorization: `Bearer ${registerBody.session.token}`, 'x-owner-id': registerBody.user.id },
      body: {
        visibility: 'private',
        occurred_at: '2024-01-01T10:00:00.000Z',
        title: 'Before backup',
        related_belief_ids: [],
        related_lesson_ids: [],
        related_value_profile_ids: [],
        related_narrative_node_ids: [],
      },
    });
    assert(firstMemory.status === 201, 'first memory creation should succeed');

    runBackupScript('backup', backupDir);

    const secondMemory = await firstInstance.handle({
      method: 'POST',
      path: '/data/memories',
      headers: { authorization: `Bearer ${registerBody.session.token}`, 'x-owner-id': registerBody.user.id },
      body: {
        visibility: 'private',
        occurred_at: '2024-01-02T10:00:00.000Z',
        title: 'After backup',
        related_belief_ids: [],
        related_lesson_ids: [],
        related_value_profile_ids: [],
        related_narrative_node_ids: [],
      },
    });
    assert(secondMemory.status === 201, 'second memory creation should succeed');

    runBackupScript('restore', backupDir);

    const secondInstance = new CapsuleApiApp();
    const loginAfterRestore = await secondInstance.handle({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'persist@example.com', password: 'Secret123!' },
      headers: { 'x-forwarded-for': '198.51.100.10' },
    });
    assert(loginAfterRestore.status === 200, 'login should succeed after restore and restart');

    const restoredSession = (loginAfterRestore.body as { user: { id: string }; session: { token: string } }).session;
    const restoredMemories = await secondInstance.handle({
      method: 'GET',
      path: `/data/memories?owner_id=${registerBody.user.id}`,
      headers: { authorization: `Bearer ${restoredSession.token}` },
    });

    assert(restoredMemories.status === 200, 'restored memories listing should succeed');
    const restoredList = restoredMemories.body as { items: Array<{ title: string }> };
    assert(restoredList.items.some((entry) => entry.title === 'Before backup'), 'backup data should be restored');
    assert(!restoredList.items.some((entry) => entry.title === 'After backup'), 'post-backup data should be reverted');
  } finally {
    runtimeEnv.CAPSULE_AUTH_STORE_BACKEND = 'memory';
    runtimeEnv.CAPSULE_DATA_STORE_BACKEND = 'memory';
    runtimeEnv.CAPSULE_EXPORT_STORE_BACKEND = 'memory';
    runtimeEnv.CAPSULE_AUTH_DB_PATH = undefined;
    runtimeEnv.CAPSULE_DATA_DB_PATH = undefined;
    runtimeEnv.CAPSULE_EXPORT_DB_PATH = undefined;

    await rm(authDbPath, { force: true });
    await rm(dataDbPath, { force: true });
    await rm(exportDbPath, { force: true });
    await rm(backupDir, { force: true, recursive: true });
  }
};
