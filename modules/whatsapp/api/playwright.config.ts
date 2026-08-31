import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@namma-medmate/playwright-config';

const port = process.env.WHATSAPP_API_PORT ?? '3003';

export default defineConfig(
  createPlaywrightConfig({
    testDir: './tests/e2e/specs',
    baseURL: `http://127.0.0.1:${port}`,
    webServer: {
      command: 'pnpm exec tsx src/local.ts',
      url: `http://127.0.0.1:${port}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        WHATSAPP_API_PORT: port,
        WHATSAPP_PERSISTENCE: 'memory',
        WHATSAPP_SERVICE_TOKEN: 'e2e-whatsapp-service',
        META_WABA_PHONE_NUMBER_ID: 'e2e-phone',
        META_WABA_ACCESS_TOKEN: 'e2e-token',
        META_WEBHOOK_APP_SECRET: 'e2e-meta-secret',
        OIDC_ISSUER: process.env.OIDC_ISSUER ?? 'http://127.0.0.1:8081',
        OIDC_AUDIENCE: process.env.OIDC_AUDIENCE ?? 'namma-medmate-dispensary',
        OIDC_JWKS_URI: process.env.OIDC_JWKS_URI ?? 'http://127.0.0.1:8081/jwks.json',
      },
    },
  }),
);
