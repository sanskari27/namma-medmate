import { checkRouteCoverage } from './route-coverage-check.ts';

export async function checkContractDrift(): Promise<void> {
  await checkRouteCoverage();
}

if (process.argv[1]?.endsWith('contract-drift-check.ts')) {
  await checkContractDrift();
  process.stdout.write('contract drift check ok\n');
}
