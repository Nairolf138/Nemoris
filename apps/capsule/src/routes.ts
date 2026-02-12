export const appRoutes = {
  onboarding: '/onboarding',
  login: '/login',
  dashboard: '/',
  memories: '/memories',
  beliefs: '/beliefs',
  lessons: '/lessons',
  values: '/values',
  messages: '/messages',
  timeline: '/timeline',
  exports: '/exports',
} as const;

export type AppRouteName = keyof typeof appRoutes;

export interface RouteGuardContext {
  hasSession: boolean;
  hasCompletedOnboarding: boolean;
}

export const resolveRoute = (requested: AppRouteName, context: RouteGuardContext): string => {
  if (!context.hasCompletedOnboarding) {
    return appRoutes.onboarding;
  }

  if (!context.hasSession && requested !== 'login' && requested !== 'onboarding') {
    return appRoutes.login;
  }

  return appRoutes[requested];
};
