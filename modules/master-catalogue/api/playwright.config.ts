import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

const port = process.env.MASTER_CATALOGUE_API_PORT ?? '3005';
const tokensPath =
  process.env.MASTER_CATALOGUE_E2E_TOKENS_PATH ?? '/tmp/master-catalogue-e2e-tokens.json';

export default defineConfig(
  createPlaywrightConfig({
    testDir: './tests/e2e/specs',
    baseURL: `http://127.0.0.1:${port}`,
    webServer: {
      command: 'pnpm exec tsx tests/e2e/serve-api.ts',
      url: `http://127.0.0.1:${port}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        MASTER_CATALOGUE_API_PORT: port,
        MASTER_CATALOGUE_PERSISTENCE: 'memory',
        MASTER_CATALOGUE_SERVICE_TOKEN: 'e2e-mc-service',
        MASTER_CATALOGUE_E2E_TOKENS_PATH: tokensPath,
      },
    },
  }),
);
