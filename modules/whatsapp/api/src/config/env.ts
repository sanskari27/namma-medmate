import { loadEnv } from '@namma-medmate/env-config';
import { z } from 'zod';

export const whatsappEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  WHATSAPP_API_PORT: z.coerce.number().int().min(1).default(3003),
  WHATSAPP_PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  WHATSAPP_SERVICE_TOKEN: z.string().min(1),
  META_WABA_PHONE_NUMBER_ID: z.string().min(1),
  META_WABA_ACCESS_TOKEN: z.string().min(1),
  META_WEBHOOK_APP_SECRET: z.string().min(1),
  META_GRAPH_BASE_URL: z.string().url().default('https://graph.facebook.com/v21.0'),
});

export type WhatsAppEnv = z.infer<typeof whatsappEnvSchema>;

export function loadWhatsAppEnv(
  source: Record<string, string | undefined> = process.env,
): WhatsAppEnv {
  return loadEnv(whatsappEnvSchema, source);
}
