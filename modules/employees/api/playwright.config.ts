import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

const port = process.env.EMPLOYEES_API_PORT ?? '3008';
const tokensPath = process.env.EMPLOYEES_E2E_TOKENS_PATH ?? '/tmp/employees-e2e-tokens.json';

export default defineConfig({
  ...createPlaywrightConfig({
    testDir: './tests/e2e/specs',
    baseURL: `http://127.0.0.1:${port}`,
    webServer: {
      command: 'pnpm exec tsx tests/e2e/serve-api.ts',
      url: `http://127.0.0.1:${port}/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        EMPLOYEES_API_PORT: port,
        EMPLOYEES_E2E_TOKENS_PATH: tokensPath,
      },
    },
  }),
  fullyParallel: false,
  workers: 1,
});
