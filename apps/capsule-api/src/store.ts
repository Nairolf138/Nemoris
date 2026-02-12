import type { AuthUser, Session } from '@capsule/core';

export class InMemoryAuthStore {
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
