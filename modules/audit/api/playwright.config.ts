import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

const port = process.env.AUDIT_API_PORT ?? '3004';
const tokensPath = process.env.AUDIT_E2E_TOKENS_PATH ?? '/tmp/audit-e2e-tokens.json';

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
        AUDIT_API_PORT: port,
        AUDIT_PERSISTENCE: 'memory',
        AUDIT_SERVICE_TOKEN: 'e2e-audit-service',
        AUDIT_E2E_TOKENS_PATH: tokensPath,
      },
    },
  }),
);
