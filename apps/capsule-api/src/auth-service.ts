import type { AuthContext, AuthUser, Session } from '@capsule/core';
import { generateToken, hashPassword, verifyPassword } from './security.js';
import { InMemoryAuthStore, type AuthStore } from './store.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

const sanitizeUser = (user: AuthUser): AuthContext['user'] => ({
  id: user.id,
  email: user.email,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const createTimestamps = () => {
  const now = new Date();
  return {
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  };
};

export class AuthService {
  public constructor(private readonly store: AuthStore = new InMemoryAuthStore()) {}

  public async register(email: string, password: string): Promise<AuthContext> {
    if (this.store.findUserByEmail(email)) {
      throw new Error('EMAIL_ALREADY_USED');
    }

    const { createdAt, expiresAt } = createTimestamps();
    const user: AuthUser = {
      id: crypto.randomUUID(),
      email,
      password_hash: await hashPassword(password),
      created_at: createdAt,
      updated_at: createdAt,
    };

    this.store.createUser(user);
    const session = this.store.saveSession({
      token: generateToken(),
      user_id: user.id,
      expires_at: expiresAt,
    });

    return { user: sanitizeUser(user), session };
  }

  public async login(email: string, password: string): Promise<AuthContext> {
    const user = this.store.findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const { expiresAt } = createTimestamps();
    const session = this.store.saveSession({
      token: generateToken(),
      user_id: user.id,
      expires_at: expiresAt,
    });

    return { user: sanitizeUser(user), session };
  }

  public logout(token: string): void {
    this.store.revokeSession(token, new Date().toISOString());
  }

  public refresh(token: string): Session {
    const session = this.store.findSessionByToken(token);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    if (session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      throw new Error('SESSION_INVALID');
    }

    this.store.revokeSession(token, new Date().toISOString());
    const { expiresAt } = createTimestamps();

    return this.store.saveSession({
      token: generateToken(),
      user_id: session.user_id,
      expires_at: expiresAt,
    });
  }

  public authenticate(token: string): AuthContext {
    const session = this.store.findSessionByToken(token);
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      throw new Error('UNAUTHENTICATED');
    }

    const user = this.store.findUserById(session.user_id);
    if (!user) {
      throw new Error('UNAUTHENTICATED');
    }

    return {
      user: sanitizeUser(user),
      session,
    };
  }
}
