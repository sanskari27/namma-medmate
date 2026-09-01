import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

const port = process.env.MANAGE_USERS_API_PORT ?? '3007';
const tokensPath = process.env.MANAGE_USERS_E2E_TOKENS_PATH ?? '/tmp/manage-users-e2e-tokens.json';

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
        MANAGE_USERS_API_PORT: port,
        MANAGE_USERS_E2E_TOKENS_PATH: tokensPath,
      },
    },
  }),
  fullyParallel: false,
  workers: 1,
});
