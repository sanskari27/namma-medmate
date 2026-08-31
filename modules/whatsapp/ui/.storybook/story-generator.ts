import { join } from 'node:path';
import { writeGeneratedStories } from '@namma-medmate/story-generator/write';
import {
  bannerScenarios,
  inboxScenarios,
  shareScenarios,
  templateScenarios,
} from '../src/scenarios/whatsapp.scenarios.ts';

const outputDir = join(import.meta.dirname, '../stories/.generated');

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'WhatsAppInboxPage',
  scenarios: [...inboxScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'MandatoryWhatsAppBanner',
  scenarios: [...bannerScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'ShareWhatsAppButton',
  scenarios: [...shareScenarios],
});

writeGeneratedStories({
  outputDir,
  importPath: '../../src/index.ts',
  componentName: 'TemplateCatalogueTable',
  scenarios: [...templateScenarios],
});
