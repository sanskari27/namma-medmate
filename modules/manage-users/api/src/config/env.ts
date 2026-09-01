import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const manageUsersEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MANAGE_USERS_API_PORT: z.coerce.number().int().min(1).default(3007),
  MANAGE_USERS_TEMP_PASSWORD_KEY: z.string().min(8).default('local-manage-users-temp-key'),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  PLAN_GATING_API_BASE_URL: z.string().url().optional(),
  AUDIT_API_BASE_URL: z.string().url().optional(),
  AUDIT_SERVICE_TOKEN: z.string().min(1).optional(),
});

export type ManageUsersEnv = z.infer<typeof manageUsersEnvSchema>;

export function loadManageUsersEnv(
  source: Record<string, string | undefined> = process.env,
): ManageUsersEnv {
  return loadEnv(manageUsersEnvSchema, source);
}
