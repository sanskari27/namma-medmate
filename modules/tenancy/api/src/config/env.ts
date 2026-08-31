import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const tenancyEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TENANCY_API_PORT: z.coerce.number().int().min(1).default(3002),
  TENANCY_PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
});

export type TenancyEnv = z.infer<typeof tenancyEnvSchema>;

export function loadTenancyEnv(
  source: Record<string, string | undefined> = process.env,
): TenancyEnv {
  return loadEnv(tenancyEnvSchema, source);
}
