import { uuidSchema } from '@namma-medmate/validation-schemas';
import { GoLiveKycErrors } from '../errors.ts';

export function parseUuid(value: string, label: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw GoLiveKycErrors.validationError(`${label} must be a UUID`);
  }
  return result.data;
}

export function readLocationId(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw GoLiveKycErrors.locationRequired();
  }
  return parseUuid(raw, 'location_id');
}

export function readBody(input: { req: { body?: unknown } }): Record<string, unknown> {
  return typeof input.req.body === 'object' && input.req.body !== null
    ? (input.req.body as Record<string, unknown>)
    : {};
}
