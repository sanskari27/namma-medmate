import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const planGatingEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PLAN_GATING_API_PORT: z.coerce.number().int().min(1).default(3006),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
});

export type PlanGatingEnv = z.infer<typeof planGatingEnvSchema>;

export function loadPlanGatingEnv(
  source: Record<string, string | undefined> = process.env,
): PlanGatingEnv {
  return loadEnv(planGatingEnvSchema, source);
}
