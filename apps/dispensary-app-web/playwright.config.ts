import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

export default defineConfig(
  createPlaywrightConfig({
    testDir: './tests/e2e/specs',
    suites: ['smoke', 'happy-path', 'failure-cases', 'a11y', 'visual'],
    baseURL: 'http://127.0.0.1:4173',
    webServer: {
      command:
        'pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
);
