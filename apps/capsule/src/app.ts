import { CapsuleApiClient } from './api-client.js';
import { CapsuleApiError } from './errors.js';
import { resolveRoute, type AppRouteName } from './routes.js';
import { SessionManager, type SessionStorageLike } from './session.js';
import { CapsuleStore } from './state.js';
import { FrontAuthService } from './services/auth-service.js';
import { CapsuleCrudService } from './services/crud-service.js';
import { CapsuleExportService } from './services/export-service.js';
import { TimelineService } from './services/timeline-service.js';

export interface FrontendArchitecture {
  store: CapsuleStore;
  apiClient: CapsuleApiClient;
  sessionManager: SessionManager;
  auth: FrontAuthService;
  crud: CapsuleCrudService;
  timeline: TimelineService;
  exports: CapsuleExportService;
  navigate(route: AppRouteName): string;
  run<T>(action: () => Promise<T>): Promise<T>;
}

export const createCapsuleFrontend = (baseUrl: string, storage: SessionStorageLike): FrontendArchitecture => {
  const store = new CapsuleStore();
  const apiClient = new CapsuleApiClient(baseUrl);
  const sessionManager = new SessionManager(storage);
  const auth = new FrontAuthService(apiClient, sessionManager, store);
  const crud = new CapsuleCrudService(apiClient, sessionManager, store);
  const timeline = new TimelineService(apiClient, sessionManager, store);
  const exports = new CapsuleExportService(apiClient, sessionManager, store);

  auth.hydrateFromStorage();

  return {
    store,
    apiClient,
    sessionManager,
    auth,
    crud,
    timeline,
    exports,
    navigate(route: AppRouteName): string {
      const state = store.getState();
      return resolveRoute(route, {
        hasSession: Boolean(state.session),
        hasCompletedOnboarding: state.onboardingCompleted,
      });
    },
    async run<T>(action: () => Promise<T>): Promise<T> {
      store.setState({ ui: { loading: true, error: undefined } });
      try {
        return await action();
      } catch (error) {
        if (error instanceof CapsuleApiError) {
          store.setState({ ui: { error: `${error.code}${error.retryAfterMs ? ` (retry in ${error.retryAfterMs}ms)` : ''}` } });
        } else {
          store.setState({ ui: { error: 'INTERNAL_ERROR' } });
        }
        throw error;
      } finally {
        store.setState({ ui: { loading: false } });
      }
    },
  };
};
