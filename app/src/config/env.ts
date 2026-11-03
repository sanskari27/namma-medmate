/**
 * Environment configuration.
 *
 * All `EXPO_PUBLIC_*` variables are inlined by Metro at build time, so this
 * module must not read `process.env` dynamically.
 */

export type AppEnv = 'development' | 'staging' | 'production';

const rawEnv = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development';

export const env = {
  appEnv: rawEnv as AppEnv,
  isDev: rawEnv === 'development',
  isProd: rawEnv === 'production',

  /** Base URL of the MedMate API. Empty while running on mock data. */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',

  /** Force the mock service layer even when an API base URL is configured. */
  useMockApi: (process.env.EXPO_PUBLIC_USE_MOCK_API ?? 'true') !== 'false',

  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
} as const;

/** True when the app should talk to the mock layer instead of a real API. */
export const shouldUseMockApi = env.useMockApi || env.apiBaseUrl.length === 0;
