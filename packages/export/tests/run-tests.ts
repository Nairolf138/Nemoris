import { runExportContractTests } from './export-contract.test.js';

const run = async () => {
  await runExportContractTests();
  console.log('All export tests passed.');
};

void run();
