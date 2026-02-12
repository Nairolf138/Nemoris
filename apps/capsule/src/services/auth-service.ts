import type { CapsuleApiClient } from '../api-client.js';
import { CapsuleApiError } from '../errors.js';
import type { SessionManager } from '../session.js';
import type { CapsuleStore } from '../state.js';

export class FrontAuthService {
  public constructor(
    private readonly api: CapsuleApiClient,
    private readonly sessionManager: SessionManager,
    private readonly store: CapsuleStore,
  ) {}

  public async register(email: string, password: string): Promise<void> {
    const auth = await this.api.register(email, password);
    this.sessionManager.saveSession(auth);
    this.sessionManager.markOnboardingComplete();
    this.store.setState({ session: auth, onboardingCompleted: true, ui: { error: undefined } });
  }

  public async login(email: string, password: string): Promise<void> {
    const auth = await this.api.login(email, password);
    this.sessionManager.saveSession(auth);
    this.store.setState({ session: auth, ui: { error: undefined } });
  }

  public async logout(): Promise<void> {
    const token = this.sessionManager.getAccessToken();
    if (token) {
      await this.api.logout(token);
    }
    this.sessionManager.clearSession();
    this.store.setState({
      session: null,
      data: {
        memories: [],
        beliefs: [],
        lessons: [],
        valueProfiles: [],
        legacyMessages: [],
        narrativeNodes: [],
        narrativeEdges: [],
      },
      exports: [],
    });
  }

  public async refreshSession(): Promise<void> {
    const current = this.sessionManager.readSession();
    if (!current) {
      throw new CapsuleApiError(401, { error: 'SESSION_NOT_FOUND' });
    }

    const next = await this.api.refresh(current.session.token);
    const updated = { ...current, session: next.session };
    this.sessionManager.saveSession(updated);
    this.store.setState({ session: updated, ui: { error: undefined } });
  }

  public hydrateFromStorage(): void {
    this.store.setState({
      session: this.sessionManager.readSession(),
      onboardingCompleted: this.sessionManager.hasCompletedOnboarding(),
    });
  }
}
