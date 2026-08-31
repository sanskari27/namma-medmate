import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  discoverContracts,
  mergeContracts,
  writeMerged,
  writeRegistry,
  repoRoot,
} from './aggregate-contracts.ts';
import { generateClientSdk } from './generate-client-sdk.ts';
import { generateTypes } from './generate-types.ts';

const execFileAsync = promisify(execFile);

const contracts = await discoverContracts();
if (contracts.length === 0) {
  throw new Error('No module OpenAPI contracts found');
}
await writeRegistry(contracts);
const merged = mergeContracts(contracts);
const mergedPath = await writeMerged(merged);
await generateTypes(mergedPath);
await generateClientSdk();
await execFileAsync(
  'pnpm',
  [
    'exec',
    'prettier',
    '--write',
    'contracts/merged-openapi.yaml',
    'contracts/registry',
    'libs/shared-types/src/generated',
    'libs/api-client/src/generated',
  ],
  { cwd: repoRoot },
);
process.stdout.write(`codegen complete for ${contracts.map((item) => item.domain).join(', ')}\n`);
