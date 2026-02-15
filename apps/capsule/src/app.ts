import { CapsuleApiClient } from './api-client.js';
import { CapsuleApiError } from './errors.js';
import { resolveRoute, type AppRouteName } from './routes.js';
import { SessionManager, type SessionStorageLike } from './session.js';
import { CapsuleStore } from './state.js';
import { FrontAuthService } from './services/auth-service.js';
import { CapsuleCrudService } from './services/crud-service.js';
import { CapsuleExportService } from './services/export-service.js';
import { OnboardingService } from './services/onboarding-service.js';
import { TimelineService } from './services/timeline-service.js';

export interface FrontendArchitecture {
  store: CapsuleStore;
  apiClient: CapsuleApiClient;
  sessionManager: SessionManager;
  auth: FrontAuthService;
  crud: CapsuleCrudService;
  timeline: TimelineService;
  exports: CapsuleExportService;
  onboarding: OnboardingService;
  navigate(route: AppRouteName): string;
  run<T>(action: () => Promise<T>, options?: { emptyWhen?: (result: T) => boolean; successMessage?: string }): Promise<T>;
}

export const createCapsuleFrontend = (baseUrl: string, storage: SessionStorageLike): FrontendArchitecture => {
  const store = new CapsuleStore();
  const apiClient = new CapsuleApiClient(baseUrl);
  const sessionManager = new SessionManager(storage);
  const auth = new FrontAuthService(apiClient, sessionManager, store);
  const crud = new CapsuleCrudService(apiClient, sessionManager, store);
  const timeline = new TimelineService(apiClient, sessionManager, store);
  const exports = new CapsuleExportService(apiClient, sessionManager, store);
  const onboarding = new OnboardingService(apiClient, sessionManager, store);

  auth.hydrateFromStorage();
  onboarding.hydrateFromStorage();

  return {
    store,
    apiClient,
    sessionManager,
    auth,
    crud,
    timeline,
    exports,
    onboarding,
    navigate(route: AppRouteName): string {
      const state = store.getState();
      return resolveRoute(route, {
        hasSession: Boolean(state.session),
        hasCompletedOnboarding: state.onboardingCompleted,
        onboardingStep: state.onboardingStep,
      });
    },
    async run<T>(action: () => Promise<T>, options?: { emptyWhen?: (result: T) => boolean; successMessage?: string }): Promise<T> {
      store.setState({ ui: { status: 'loading', loading: true, error: undefined, message: undefined } });
      try {
        const result = await action();
        store.setState({
          ui: {
            status: options?.emptyWhen?.(result) ? 'empty' : 'ready',
            message: options?.successMessage,
          },
        });
        return result;
      } catch (error) {
        if (error instanceof CapsuleApiError) {
          store.setState({
            ui: {
              status: 'error',
              error: `${error.code}${error.retryAfterMs ? ` (retry in ${error.retryAfterMs}ms)` : ''}`,
            },
          });
        } else {
          store.setState({ ui: { status: 'error', error: 'INTERNAL_ERROR' } });
        }
        throw error;
      } finally {
        store.setState({ ui: { loading: false } });
      }
    },
  };
};
