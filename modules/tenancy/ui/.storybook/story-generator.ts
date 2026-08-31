import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import {
  createPharmacyScenarios,
  renameShopScenarios,
  shopIdentityScenarios,
} from '../src/scenarios/tenancy.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'TenantShell',
  scenarios: [...shopIdentityScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'CreatePharmacyFields',
  scenarios: [...createPharmacyScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'RenameShopForm',
  scenarios: [...renameShopScenarios],
});
