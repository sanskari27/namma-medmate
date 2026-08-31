import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import { hqTableScenarios, tableScenarios } from '../src/scenarios/audit.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'AuditEventTable',
  scenarios: [...tableScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'HqAuditEventTable',
  scenarios: [...hqTableScenarios],
});
