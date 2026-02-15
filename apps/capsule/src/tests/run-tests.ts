import { runNavigationIntegrationTests } from './navigation-integration.test.js';
import { runOnboardingIntegrationTests } from './onboarding-integration.test.js';

const run = async (): Promise<void> => {
  await runNavigationIntegrationTests();
  await runOnboardingIntegrationTests();
};

void run();
