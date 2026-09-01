import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const masterCatalogueEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MASTER_CATALOGUE_API_PORT: z.coerce.number().int().min(1).default(3005),
  MASTER_CATALOGUE_PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  MASTER_CATALOGUE_SERVICE_TOKEN: z.string().min(1),
  AUDIT_API_BASE_URL: z.string().url().optional(),
  AUDIT_SERVICE_TOKEN: z.string().min(1).optional(),
  INVENTORY_API_BASE_URL: z.string().url().optional(),
});

export type MasterCatalogueEnv = z.infer<typeof masterCatalogueEnvSchema>;

export function loadMasterCatalogueEnv(
  source: Record<string, string | undefined> = process.env,
): MasterCatalogueEnv {
  return loadEnv(masterCatalogueEnvSchema, source);
}
