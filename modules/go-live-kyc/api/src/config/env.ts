import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const goLiveKycEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  GO_LIVE_KYC_API_PORT: z.coerce.number().int().min(1).default(3009),
  GO_LIVE_KYC_PII_KEY: z.string().min(8),
  GO_LIVE_KYC_STORAGE_BUCKET: z.string().min(1).default('go-live-kyc'),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  PLAN_GATING_API_BASE_URL: z.string().url().optional(),
  AUDIT_API_BASE_URL: z.string().url().optional(),
  AUDIT_SERVICE_TOKEN: z.string().min(1).optional(),
  MANAGE_USERS_API_BASE_URL: z.string().url().optional(),
  INVENTORY_API_BASE_URL: z.string().url().optional(),
  BOOKS_GST_API_BASE_URL: z.string().url().optional(),
  ACCOUNT_SETTINGS_API_BASE_URL: z.string().url().optional(),
});

export type GoLiveKycEnv = z.infer<typeof goLiveKycEnvSchema>;

export function loadGoLiveKycEnv(
  source: Record<string, string | undefined> = process.env,
): GoLiveKycEnv {
  return loadEnv(goLiveKycEnvSchema, source);
}
