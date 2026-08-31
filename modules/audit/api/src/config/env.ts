import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const auditEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUDIT_API_PORT: z.coerce.number().int().min(1).default(3004),
  AUDIT_PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  AUDIT_SERVICE_TOKEN: z.string().min(1),
});

export type AuditEnv = z.infer<typeof auditEnvSchema>;

export function loadAuditEnv(source: Record<string, string | undefined> = process.env): AuditEnv {
  return loadEnv(auditEnvSchema, source);
}
