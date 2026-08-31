import type { PlaywrightTestConfig } from '@playwright/test';

export function createPlaywrightConfig(options: {
  testDir: string;
  baseURL?: string;
  webServer?: PlaywrightTestConfig['webServer'];
}): PlaywrightTestConfig;
