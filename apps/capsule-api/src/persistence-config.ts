import type { CapsulePersistence, PersistenceBackend } from '@capsule/core';
import { createInMemoryPersistence, createSqlitePersistence } from '@capsule/core';
import type { ExportRepository } from './export-repository.js';
import { InMemoryExportRepository, SqliteExportRepository } from './export-repository.js';
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

export const PERSISTENCE_ENV_KEYS = {
  authBackend: 'CAPSULE_AUTH_STORE_BACKEND',
  capsuleBackend: 'CAPSULE_DATA_STORE_BACKEND',
  exportBackend: 'CAPSULE_EXPORT_STORE_BACKEND',
  authDbPath: 'CAPSULE_AUTH_DB_PATH',
  capsuleDbPath: 'CAPSULE_DATA_DB_PATH',
  exportDbPath: 'CAPSULE_EXPORT_DB_PATH',
} as const;

export const PERSISTENCE_DEFAULTS = {
  authDbPath: './capsule-auth.sqlite',
  capsuleDbPath: './capsule-data.sqlite',
  exportDbPath: './capsule-export.sqlite',
} as const;

export interface PersistenceOptions {
  authBackend: PersistenceBackend;
  capsuleBackend: PersistenceBackend;
  exportBackend: PersistenceBackend;
  authDbPath: string;
  capsuleDbPath: string;
  exportDbPath: string;
}

export const readPersistenceOptions = (env: RuntimeEnv = runtimeEnv): PersistenceOptions => ({
  authBackend: readBackend(env[PERSISTENCE_ENV_KEYS.authBackend], PERSISTENCE_ENV_KEYS.authBackend),
  capsuleBackend: readBackend(env[PERSISTENCE_ENV_KEYS.capsuleBackend], PERSISTENCE_ENV_KEYS.capsuleBackend),
  exportBackend: readBackend(env[PERSISTENCE_ENV_KEYS.exportBackend], PERSISTENCE_ENV_KEYS.exportBackend),
  authDbPath: env[PERSISTENCE_ENV_KEYS.authDbPath] ?? PERSISTENCE_DEFAULTS.authDbPath,
  capsuleDbPath: env[PERSISTENCE_ENV_KEYS.capsuleDbPath] ?? PERSISTENCE_DEFAULTS.capsuleDbPath,
  exportDbPath: env[PERSISTENCE_ENV_KEYS.exportDbPath] ?? PERSISTENCE_DEFAULTS.exportDbPath,
});

export interface PersistenceProviders {
  authStore: AuthStore;
  capsulePersistence: CapsulePersistence;
  exportRepository: ExportRepository;
}

export const createPersistenceProviders = (): PersistenceProviders => {
  const options = readPersistenceOptions();

  const authStore =
    options.authBackend === 'sqlite' ? new SqliteAuthStore(options.authDbPath) : new InMemoryAuthStore();

  const capsulePersistence =
    options.capsuleBackend === 'sqlite'
      ? createSqlitePersistence(options.capsuleDbPath)
      : createInMemoryPersistence();

  const exportRepository =
    options.exportBackend === 'sqlite'
      ? new SqliteExportRepository(options.exportDbPath)
      : new InMemoryExportRepository();

  return { authStore, capsulePersistence, exportRepository };
};
