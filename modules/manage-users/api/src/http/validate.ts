import { uuidSchema } from '@namma-medmate/validation-schemas';
import { ManageUsersErrors } from '../errors.ts';

export function parseUuid(value: string, label: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw ManageUsersErrors.validationError(`${label} must be a UUID`);
  }
  return result.data;
}

export function readLocationId(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw ManageUsersErrors.locationRequired();
  }
  return parseUuid(raw, 'location_id');
}
