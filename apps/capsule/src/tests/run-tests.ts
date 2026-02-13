import { runNavigationIntegrationTests } from './navigation-integration.test.js';

const run = async (): Promise<void> => {
  await runNavigationIntegrationTests();
};

void run();
