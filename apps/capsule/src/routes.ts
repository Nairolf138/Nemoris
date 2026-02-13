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

export const getRouteNameByPath = (path: string): AppRouteName => {
  const found = Object.entries(appRoutes).find(([, routePath]) => routePath === path)?.[0] as AppRouteName | undefined;
  return found ?? 'dashboard';
};

export const resolveRoute = (requested: AppRouteName | string, context: RouteGuardContext): string => {
  const requestedRoute = typeof requested === 'string' ? getRouteNameByPath(requested) : requested;

  if (!context.hasCompletedOnboarding && requestedRoute !== 'onboarding') {
    return appRoutes.onboarding;
  }

  if (!context.hasSession && requestedRoute !== 'login' && requestedRoute !== 'onboarding') {
    return appRoutes.login;
  }

  return appRoutes[requestedRoute];
};
