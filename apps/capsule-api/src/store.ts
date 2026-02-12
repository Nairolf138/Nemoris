import { spawnSync } from 'node:child_process';
import type { AuthUser, Session } from '@capsule/core';

export interface AuthStore {
  createUser(user: AuthUser): AuthUser;
  findUserByEmail(email: string): AuthUser | undefined;
  findUserById(id: string): AuthUser | undefined;
  saveSession(session: Session): Session;
  findSessionByToken(token: string): Session | undefined;
  revokeSession(token: string, revokedAt: string): Session | undefined;
}

type SqlRow = Record<string, string | null>;

const sqliteLiteral = (value: string | null): string => {
  if (value === null) {
    return 'NULL';
  }
  return `'${value.replace(/'/g, "''")}'`;
};

const bindSql = (sql: string, params: Array<string | null>): string => {
  let index = 0;
  return sql.replace(/\?/g, () => {
    const value = params[index];
    index += 1;
    return sqliteLiteral(value ?? null);
  });
};

class SqlitePreparedStatement {
  public constructor(
    private readonly client: SqliteClient,
    private readonly sql: string,
  ) {}

  public run(params: Array<string | null>): void {
    this.client.exec(bindSql(this.sql, params));
  }

  public get(params: Array<string | null>): SqlRow | undefined {
    const rows = this.client.query(bindSql(this.sql, params));
    return rows[0];
  }
}

class SqliteClient {
  private static readonly clients = new Map<string, SqliteClient>();

  public static forPath(path: string): SqliteClient {
    const existing = SqliteClient.clients.get(path);
    if (existing) {
      return existing;
    }
    const created = new SqliteClient(path);
    SqliteClient.clients.set(path, created);
    return created;
  }

  private constructor(private readonly path: string) {}

  public prepare(sql: string): SqlitePreparedStatement {
    return new SqlitePreparedStatement(this, sql);
  }

  public exec(sql: string): void {
    const result = spawnSync('sqlite3', [this.path, sql], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || 'sqlite command failed');
    }
  }

  public query(sql: string): SqlRow[] {
    const result = spawnSync('sqlite3', ['-json', this.path, sql], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || 'sqlite command failed');
    }
    const raw = result.stdout.trim();
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as SqlRow[];
  }
}

export class InMemoryAuthStore implements AuthStore {
  private usersById = new Map<string, AuthUser>();
  private usersByEmail = new Map<string, AuthUser>();
  private sessionsByToken = new Map<string, Session>();

  public createUser(user: AuthUser): AuthUser {
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  public findUserByEmail(email: string): AuthUser | undefined {
    return this.usersByEmail.get(email);
  }

  public findUserById(id: string): AuthUser | undefined {
    return this.usersById.get(id);
  }

  public saveSession(session: Session): Session {
    this.sessionsByToken.set(session.token, session);
    return session;
  }

  public findSessionByToken(token: string): Session | undefined {
    return this.sessionsByToken.get(token);
  }

  public revokeSession(token: string, revokedAt: string): Session | undefined {
    const session = this.sessionsByToken.get(token);
    if (!session) {
      return undefined;
    }
    const revoked = { ...session, revoked_at: revokedAt };
    this.sessionsByToken.set(token, revoked);
    return revoked;
  }
}

export class SqliteAuthStore implements AuthStore {
  private readonly client;
  private readonly createUserStmt;
  private readonly findUserByEmailStmt;
  private readonly findUserByIdStmt;
  private readonly saveSessionStmt;
  private readonly findSessionByTokenStmt;
  private readonly revokeSessionStmt;

  public constructor(path: string) {
    this.client = SqliteClient.forPath(path);
    this.client.exec(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );
    `);

    this.createUserStmt = this.client.prepare(
      'INSERT INTO auth_users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    );
    this.findUserByEmailStmt = this.client.prepare(
      'SELECT id, email, password_hash, created_at, updated_at FROM auth_users WHERE email = ? LIMIT 1;',
    );
    this.findUserByIdStmt = this.client.prepare(
      'SELECT id, email, password_hash, created_at, updated_at FROM auth_users WHERE id = ? LIMIT 1;',
    );
    this.saveSessionStmt = this.client.prepare(
      'INSERT INTO auth_sessions (token, user_id, expires_at, revoked_at) VALUES (?, ?, ?, ?);',
    );
    this.findSessionByTokenStmt = this.client.prepare(
      'SELECT token, user_id, expires_at, revoked_at FROM auth_sessions WHERE token = ? LIMIT 1;',
    );
    this.revokeSessionStmt = this.client.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token = ?;');
  }

  public createUser(user: AuthUser): AuthUser {
    this.createUserStmt.run([user.id, user.email, user.password_hash, user.created_at, user.updated_at]);
    return user;
  }

  public findUserByEmail(email: string): AuthUser | undefined {
    const row = this.findUserByEmailStmt.get([email]);
    return row as AuthUser | undefined;
  }

  public findUserById(id: string): AuthUser | undefined {
    const row = this.findUserByIdStmt.get([id]);
    return row as AuthUser | undefined;
  }

  public saveSession(session: Session): Session {
    this.saveSessionStmt.run([session.token, session.user_id, session.expires_at, session.revoked_at ?? null]);
    return session;
  }

  public findSessionByToken(token: string): Session | undefined {
    const row = this.findSessionByTokenStmt.get([token]);
    return row as Session | undefined;
  }

  public revokeSession(token: string, revokedAt: string): Session | undefined {
    const session = this.findSessionByToken(token);
    if (!session) {
      return undefined;
    }
    this.revokeSessionStmt.run([revokedAt, token]);
    return { ...session, revoked_at: revokedAt };
  }
}
