import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import {
  navLockScenarios,
  paywallScenarios,
  planGateScenarios,
} from '../src/scenarios/plan-gating.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'PlanGate',
  scenarios: [...planGateScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'Paywall',
  scenarios: [...paywallScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'NavLockIcon',
  scenarios: [...navLockScenarios],
});
