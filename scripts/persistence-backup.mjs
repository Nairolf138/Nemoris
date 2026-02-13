#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const env = process.env;

const PERSISTENCE = {
  auth: {
    backendEnv: 'CAPSULE_AUTH_STORE_BACKEND',
    pathEnv: 'CAPSULE_AUTH_DB_PATH',
    fallbackPath: './capsule-auth.sqlite',
  },
  data: {
    backendEnv: 'CAPSULE_DATA_STORE_BACKEND',
    pathEnv: 'CAPSULE_DATA_DB_PATH',
    fallbackPath: './capsule-data.sqlite',
  },
  export: {
    backendEnv: 'CAPSULE_EXPORT_STORE_BACKEND',
    pathEnv: 'CAPSULE_EXPORT_DB_PATH',
    fallbackPath: './capsule-export.sqlite',
  },
};

const usage = () => {
  console.log('Usage: node scripts/persistence-backup.mjs <backup|restore> --dir <directory>');
};

const parseArgs = () => {
  const [action, ...rest] = process.argv.slice(2);
  const dirIndex = rest.findIndex((entry) => entry === '--dir');
  const dir = dirIndex >= 0 ? rest[dirIndex + 1] : undefined;
  if (!action || !dir || (action !== 'backup' && action !== 'restore')) {
    usage();
    process.exit(1);
  }
  return { action, dir: resolve(dir) };
};

const configuredSqliteDatabases = () => {
  return Object.entries(PERSISTENCE)
    .map(([name, config]) => {
      const backend = (env[config.backendEnv] ?? 'memory').toLowerCase();
      if (backend !== 'sqlite') {
        return null;
      }
      const dbPath = resolve(env[config.pathEnv] ?? config.fallbackPath);
      return { name, dbPath };
    })
    .filter(Boolean);
};

const backupDatabase = (sourcePath, backupPath) => {
  execFileSync('sqlite3', [sourcePath, `.backup ${JSON.stringify(backupPath)}`], { stdio: 'inherit' });
};

const runBackup = async (dir) => {
  const databases = configuredSqliteDatabases();
  await mkdir(dir, { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    databases: [],
  };

  for (const database of databases) {
    const targetPath = resolve(dir, `${database.name}.sqlite`);
    backupDatabase(database.dbPath, targetPath);
    manifest.databases.push({
      name: database.name,
      sourcePath: database.dbPath,
      backupPath: targetPath,
    });
    console.log(`Backed up ${database.name}: ${database.dbPath} -> ${targetPath}`);
  }

  const manifestPath = resolve(dir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Backup manifest written: ${manifestPath}`);
};

const runRestore = async (dir) => {
  const manifestPath = resolve(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const entry of manifest.databases) {
    if (!existsSync(entry.backupPath)) {
      throw new Error(`Missing backup file for ${entry.name}: ${entry.backupPath}`);
    }
    await mkdir(dirname(entry.sourcePath), { recursive: true });
    await cp(entry.backupPath, entry.sourcePath);
    console.log(`Restored ${entry.name}: ${basename(entry.backupPath)} -> ${entry.sourcePath}`);
  }
};

const main = async () => {
  const { action, dir } = parseArgs();
  if (action === 'backup') {
    await runBackup(dir);
    return;
  }
  await runRestore(dir);
};

await main();
