import { uuidSchema } from '@namma-medmate/validation-schemas';
import { PlanGatingErrors } from '../errors.ts';

export function parseUuid(value: string, label: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw PlanGatingErrors.validationFailed(`${label} must be a UUID`);
  }
  return result.data;
}
