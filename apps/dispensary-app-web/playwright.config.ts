import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

export default defineConfig(
  createPlaywrightConfig({
    testDir: './tests/e2e/playwright',
    baseURL: 'http://127.0.0.1:4173',
    webServer: {
      command: 'pnpm exec vite build && pnpm exec vite preview --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
  }),
);
