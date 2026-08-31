import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import { authScenarios } from '../src/scenarios/auth.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'AuthWidget',
  scenarios: [...authScenarios],
});
