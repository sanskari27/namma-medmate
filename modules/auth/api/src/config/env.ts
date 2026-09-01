import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const authEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUTH_API_PORT: z.coerce.number().int().min(1).default(3001),
  AUTH_PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  WHATSAPP_API_BASE_URL: z.string().url().optional(),
  WHATSAPP_SERVICE_TOKEN: z.string().min(1).optional(),
  AUDIT_API_BASE_URL: z.string().url().optional(),
  AUDIT_SERVICE_TOKEN: z.string().min(1).optional(),
  AUTH_FIXED_OTP: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function loadAuthEnv(source: Record<string, string | undefined> = process.env): AuthEnv {
  return loadEnv(authEnvSchema, source);
}
