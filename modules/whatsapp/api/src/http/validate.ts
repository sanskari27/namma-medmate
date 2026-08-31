import { z } from 'zod';
import { uuidSchema } from '@namma-medmate/validation-schemas';
import { WhatsAppErrors } from '../errors.ts';

export function parseUuid(value: string | undefined, label: string): string {
  const result = uuidSchema.safeParse(value ?? '');
  if (!result.success) {
    throw WhatsAppErrors.validationFailed(`${label} must be a UUID`);
  }
  return result.data;
}

const e164 = /^\+[1-9]\d{6,14}$/;

export function parseMobileTo(value: unknown): string {
  if (typeof value !== 'string' || !e164.test(value)) {
    throw WhatsAppErrors.invalidTo();
  }
  if (value.startsWith('+91')) {
    const national = value.slice(3);
    if (national.length !== 10 || !/^[6-9]/.test(national)) {
      throw WhatsAppErrors.invalidTo();
    }
  } else if (value.length < 12) {
    throw WhatsAppErrors.invalidTo();
  }
  return value;
}

export function parseOptionalMobileTo(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return parseMobileTo(value);
}

export const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
