import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import { queueScenarios, wizardScenarios } from '../src/scenarios/go-live-kyc.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'GoLiveWizardPage',
  scenarios: [...wizardScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'HqKycQueuePage',
  scenarios: [...queueScenarios],
});
