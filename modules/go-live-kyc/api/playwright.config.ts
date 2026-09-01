import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

const port = process.env.GO_LIVE_KYC_API_PORT ?? '3009';
const tokensPath = process.env.GO_LIVE_KYC_E2E_TOKENS_PATH ?? '/tmp/go-live-kyc-e2e-tokens.json';

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
        GO_LIVE_KYC_API_PORT: port,
        GO_LIVE_KYC_E2E_TOKENS_PATH: tokensPath,
      },
    },
  }),
  fullyParallel: false,
  workers: 1,
});
