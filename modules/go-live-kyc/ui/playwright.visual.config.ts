import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

export default defineConfig(
  createPlaywrightConfig({
    testDir: './tests/e2e/specs',
    suites: ['visual'],
    baseURL: 'http://127.0.0.1:6011',
    webServer: {
      command:
        'pnpm exec tsx .storybook/story-generator.ts && pnpm exec storybook dev -p 6011 --no-open',
      url: 'http://127.0.0.1:6011',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
);
