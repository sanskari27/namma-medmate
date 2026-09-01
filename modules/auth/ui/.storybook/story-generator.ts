import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import {
  authWidgetScenarios,
  loginPageScenarios,
  pinUnlockScenarios,
} from '../src/scenarios/auth.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'AuthWidget',
  scenarios: [...authWidgetScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'LoginPage',
  scenarios: [...loginPageScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'PinUnlockPage',
  scenarios: [...pinUnlockScenarios],
});
