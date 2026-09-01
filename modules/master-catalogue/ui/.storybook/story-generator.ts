import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import {
  addModalScenarios,
  drawerScenarios,
  listScenarios,
} from '../src/scenarios/master-catalogue.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'MasterCatalogueList',
  scenarios: [...listScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'MasterCatalogueDrawer',
  scenarios: [...drawerScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'AddMedicineModal',
  scenarios: [...addModalScenarios],
});
