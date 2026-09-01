import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import { employeesPageScenarios } from '../src/scenarios/employees.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'EmployeesPage',
  scenarios: [...employeesPageScenarios],
});
