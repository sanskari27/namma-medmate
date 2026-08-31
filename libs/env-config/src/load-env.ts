import type { ZodType } from 'zod';

export class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvConfigError';
  }
}

export function loadEnv<T extends ZodType>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): T['_output'] {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvConfigError(`Invalid environment: ${result.error.message}`);
  }
  return result.data;
}

export function pickEnv(
  names: readonly string[],
  source: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  return Object.fromEntries(names.map((name) => [name, source[name]]));
}
