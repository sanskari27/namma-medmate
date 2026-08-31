import { z } from 'zod';
import { uuidSchema } from '@namma-medmate/validation-schemas';
import { TenancyErrors } from '../errors.ts';

export const displayNameSchema = z.string().trim().min(1).max(120);

export function parseUuid(value: string | undefined, label: string): string {
  const result = uuidSchema.safeParse(value ?? '');
  if (!result.success) {
    throw TenancyErrors.validationFailed(`${label} must be a UUID`);
  }
  return result.data;
}

export function parseDisplayName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw TenancyErrors.displayNameRequired();
  }
  const parsed = displayNameSchema.safeParse(value);
  if (!parsed.success) {
    throw TenancyErrors.validationFailed('Display name must be 1 to 120 characters');
  }
  return parsed.data;
}
