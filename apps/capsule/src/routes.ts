import type { OnboardingStepKey } from './models/contracts.js';

export const appRoutes = {
  onboarding: '/onboarding',
  onboardingIdentityContact: '/onboarding/identite-contact',
  onboardingMessages: '/onboarding/messages',
  onboardingDocuments: '/onboarding/documents-importants',
  onboardingBeneficiariesRules: '/onboarding/beneficiaires-regles',
  login: '/login',
  dashboard: '/',
  memories: '/memories',
  beliefs: '/beliefs',
  lessons: '/lessons',
  values: '/values',
  messages: '/messages',
  timeline: '/timeline',
  exports: '/exports',
  capsuleSummary: '/capsule-summary',
} as const;

export type AppRouteName = keyof typeof appRoutes;

const onboardingRouteByStep: Record<OnboardingStepKey, AppRouteName> = {
  identityContact: 'onboardingIdentityContact',
  messages: 'onboardingMessages',
  documents: 'onboardingDocuments',
  beneficiariesRules: 'onboardingBeneficiariesRules',
};

const onboardingRouteNames = new Set<AppRouteName>([
  'onboarding',
  'onboardingIdentityContact',
  'onboardingMessages',
  'onboardingDocuments',
  'onboardingBeneficiariesRules',
]);

export const getOnboardingRoute = (step: OnboardingStepKey): string => appRoutes[onboardingRouteByStep[step]];

export interface RouteGuardContext {
  hasSession: boolean;
  hasCompletedOnboarding: boolean;
  onboardingStep: OnboardingStepKey;
}

export const getRouteNameByPath = (path: string): AppRouteName => {
  const found = Object.entries(appRoutes).find(([, routePath]) => routePath === path)?.[0] as AppRouteName | undefined;
  return found ?? 'dashboard';
};

export const resolveRoute = (requested: AppRouteName | string, context: RouteGuardContext): string => {
  const requestedRoute =
    typeof requested === 'string'
      ? ((requested in appRoutes ? requested : getRouteNameByPath(requested)) as AppRouteName)
      : requested;

  if (!context.hasCompletedOnboarding && !onboardingRouteNames.has(requestedRoute)) {
    return getOnboardingRoute(context.onboardingStep);
  }

  if (context.hasCompletedOnboarding && onboardingRouteNames.has(requestedRoute)) {
    return context.hasSession ? appRoutes.dashboard : appRoutes.login;
  }

  if (!context.hasSession && requestedRoute !== 'login' && !onboardingRouteNames.has(requestedRoute)) {
    return appRoutes.login;
  }

  return appRoutes[requestedRoute];
};
