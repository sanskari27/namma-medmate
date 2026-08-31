import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const authEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUTH_API_PORT: z.coerce.number().int().min(1).default(3001),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function loadAuthEnv(source: Record<string, string | undefined> = process.env): AuthEnv {
  return loadEnv(authEnvSchema, source);
}
