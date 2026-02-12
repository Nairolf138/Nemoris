import type { CapsulePersistence, PersistenceBackend } from '@capsule/core';
import { createInMemoryPersistence, createSqlitePersistence } from '@capsule/core';
import type { AuthStore } from './store.js';
import { InMemoryAuthStore, SqliteAuthStore } from './store.js';

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const readBackend = (value: string | undefined, key: string): PersistenceBackend => {
  if (!value) {
    return 'memory';
  }
  if (value === 'memory' || value === 'sqlite') {
    return value;
  }
  throw new Error(`${key} must be one of: memory, sqlite`);
};

export interface PersistenceProviders {
  authStore: AuthStore;
  capsulePersistence: CapsulePersistence;
}

export const createPersistenceProviders = (): PersistenceProviders => {
  const authBackend = readBackend(runtimeEnv.CAPSULE_AUTH_STORE_BACKEND, 'CAPSULE_AUTH_STORE_BACKEND');
  const capsuleBackend = readBackend(runtimeEnv.CAPSULE_DATA_STORE_BACKEND, 'CAPSULE_DATA_STORE_BACKEND');

  const authStore =
    authBackend === 'sqlite'
      ? new SqliteAuthStore(runtimeEnv.CAPSULE_AUTH_DB_PATH ?? './capsule-auth.sqlite')
      : new InMemoryAuthStore();

  const capsulePersistence =
    capsuleBackend === 'sqlite'
      ? createSqlitePersistence(runtimeEnv.CAPSULE_DATA_DB_PATH ?? './capsule-data.sqlite')
      : createInMemoryPersistence();

  return { authStore, capsulePersistence };
};
