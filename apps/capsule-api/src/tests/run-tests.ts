import { runAuthIntegrationTests } from './auth-integration.test.js';
import { runAuthServiceTests } from './auth-service.test.js';
import { runExportIntegrationTests } from './export-integration.test.js';

const run = async () => {
  await runAuthServiceTests();
  await runAuthIntegrationTests();
  await runExportIntegrationTests();
  console.log('All capsule-api tests passed.');
};

void run();
