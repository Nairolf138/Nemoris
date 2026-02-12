import { runAuthIntegrationTests } from './auth-integration.test.js';
import { runAuthServiceTests } from './auth-service.test.js';

const run = async () => {
  await runAuthServiceTests();
  await runAuthIntegrationTests();
  console.log('All capsule-api tests passed.');
};

void run();
