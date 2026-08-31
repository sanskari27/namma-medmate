import { defineConfig } from '@playwright/test';
import { visualRegressionConfig } from '@namma-medmate/visual-regression-config';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: visualRegressionConfig.maxDiffPixelRatio,
      threshold: visualRegressionConfig.threshold,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:6006',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'pnpm exec tsx .storybook/story-generator.ts && pnpm exec storybook dev -p 6006 --no-open',
    url: 'http://127.0.0.1:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
