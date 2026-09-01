import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const employeesEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  EMPLOYEES_API_PORT: z.coerce.number().int().min(1).default(3008),
  EMPLOYEES_PII_KEY: z.string().min(8),
  EMPLOYEES_STORAGE_BUCKET: z.string().min(1).default('employees'),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  PLAN_GATING_API_BASE_URL: z.string().url().optional(),
  AUDIT_API_BASE_URL: z.string().url().optional(),
  AUDIT_SERVICE_TOKEN: z.string().min(1).optional(),
});

export type EmployeesEnv = z.infer<typeof employeesEnvSchema>;

export function loadEmployeesEnv(
  source: Record<string, string | undefined> = process.env,
): EmployeesEnv {
  return loadEnv(employeesEnvSchema, source);
}
