import type { AuthSessionResponse } from './models/contracts.js';

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SESSION_KEY = 'capsule.session';
const ONBOARDING_KEY = 'capsule.onboarding.completed';

export class SessionManager {
  public constructor(private readonly storage: SessionStorageLike) {}

  public readSession(): AuthSessionResponse | null {
    const raw = this.storage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthSessionResponse;
    } catch {
      this.storage.removeItem(SESSION_KEY);
      return null;
    }
  }

  public saveSession(session: AuthSessionResponse): void {
    this.storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  public clearSession(): void {
    this.storage.removeItem(SESSION_KEY);
  }

  public getAccessToken(): string | undefined {
    return this.readSession()?.session.token;
  }

  public markOnboardingComplete(): void {
    this.storage.setItem(ONBOARDING_KEY, 'true');
  }

  public hasCompletedOnboarding(): boolean {
    return this.storage.getItem(ONBOARDING_KEY) === 'true';
  }
}
