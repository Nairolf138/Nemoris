import { execFileSync } from 'node:child_process';
import type { AuthUser, Session } from '@capsule/core';

export interface AuthStore {
  createUser(user: AuthUser): AuthUser;
  findUserByEmail(email: string): AuthUser | undefined;
  findUserById(id: string): AuthUser | undefined;
  saveSession(session: Session): Session;
  findSessionByToken(token: string): Session | undefined;
  revokeSession(token: string, revokedAt: string): Session | undefined;
}

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const runSql = (dbPath: string, sql: string): string => {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
};

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
  public constructor(private readonly path: string) {
    runSql(
      this.path,
      `
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
    `,
    );
  }

  public createUser(user: AuthUser): AuthUser {
    runSql(
      this.path,
      `INSERT INTO auth_users (id, email, password_hash, created_at, updated_at) VALUES (${quote(user.id)}, ${quote(user.email)}, ${quote(user.password_hash)}, ${quote(user.created_at)}, ${quote(user.updated_at)});`,
    );
    return user;
  }

  public findUserByEmail(email: string): AuthUser | undefined {
    const raw = runSql(
      this.path,
      `SELECT json_object('id', id, 'email', email, 'password_hash', password_hash, 'created_at', created_at, 'updated_at', updated_at) FROM auth_users WHERE email = ${quote(email)} LIMIT 1;`,
    ).trim();
    return raw ? (JSON.parse(raw) as AuthUser) : undefined;
  }

  public findUserById(id: string): AuthUser | undefined {
    const raw = runSql(
      this.path,
      `SELECT json_object('id', id, 'email', email, 'password_hash', password_hash, 'created_at', created_at, 'updated_at', updated_at) FROM auth_users WHERE id = ${quote(id)} LIMIT 1;`,
    ).trim();
    return raw ? (JSON.parse(raw) as AuthUser) : undefined;
  }

  public saveSession(session: Session): Session {
    const revoked = session.revoked_at ? quote(session.revoked_at) : 'NULL';
    runSql(
      this.path,
      `INSERT INTO auth_sessions (token, user_id, expires_at, revoked_at) VALUES (${quote(session.token)}, ${quote(session.user_id)}, ${quote(session.expires_at)}, ${revoked});`,
    );
    return session;
  }

  public findSessionByToken(token: string): Session | undefined {
    const raw = runSql(
      this.path,
      `SELECT json_object('token', token, 'user_id', user_id, 'expires_at', expires_at, 'revoked_at', revoked_at) FROM auth_sessions WHERE token = ${quote(token)} LIMIT 1;`,
    ).trim();
    return raw ? (JSON.parse(raw) as Session) : undefined;
  }

  public revokeSession(token: string, revokedAt: string): Session | undefined {
    const session = this.findSessionByToken(token);
    if (!session) {
      return undefined;
    }
    runSql(this.path, `UPDATE auth_sessions SET revoked_at = ${quote(revokedAt)} WHERE token = ${quote(token)};`);
    return { ...session, revoked_at: revokedAt };
  }
}
