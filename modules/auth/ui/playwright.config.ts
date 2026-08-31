import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

export default defineConfig(
  createPlaywrightConfig({
    testDir: './tests/e2e/playwright',
    baseURL: 'http://127.0.0.1:6006',
    webServer: {
      command:
        'pnpm exec tsx .storybook/story-generator.ts && pnpm exec storybook dev -p 6006 --no-open',
      url: 'http://127.0.0.1:6006',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
);
