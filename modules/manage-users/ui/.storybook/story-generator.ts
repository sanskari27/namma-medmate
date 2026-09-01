import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import { manageUsersPageScenarios } from '../src/scenarios/manage-users.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'ManageUsersPage',
  scenarios: [...manageUsersPageScenarios],
});
