import { z } from 'zod';
import { uuidSchema } from '@namma-medmate/validation-schemas';
import { AuditErrors } from '../errors.ts';

const SNAPSHOT_MAX_BYTES = 64 * 1024;
const SECRET_KEY_FRAGMENTS = [
  'password',
  'pin',
  'otp',
  'gstn_password',
  'irp_secret',
  'waba_token',
  'cashfree_secret',
];

export const MONEY_OR_STOCK_ACTIONS = new Set([
  'bill_posted',
  'credit_note_posted',
  'grn_posted',
  'write_off_posted',
  'khata_repayment_posted',
  'stock_take_posted',
]);

export const ingestBodySchema = z.object({
  idempotency_key: z.string().min(1).optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  actor_user_id: z.string(),
  actor_role: z.string(),
  actor_surface: z.enum(['pharmacy', 'hq', 'kiosk', 'system']),
  action: z.string().min(1),
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  money_or_stock: z.boolean(),
  before: z.record(z.unknown()).nullable().optional(),
  after: z.record(z.unknown()).nullable().optional(),
  client_occurred_at: z.string().datetime().optional(),
  request_id: z.string().min(1).optional(),
});

export function parseUuid(value: string | undefined, label: string): string {
  const result = uuidSchema.safeParse(value ?? '');
  if (!result.success) {
    throw AuditErrors.validationFailed(`${label} must be a UUID`);
  }
  return result.data;
}

export function parseOptionalUuid(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw AuditErrors.validationFailed(`${label} must be a UUID`);
  }
  return parseUuid(value, label);
}

export function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === '') {
    return 50;
  }
  const parsed = z.coerce.number().int().min(1).safeParse(raw);
  if (!parsed.success) {
    throw AuditErrors.validationFailed('limit must be a positive integer');
  }
  return Math.min(parsed.data, 200);
}

export function parseOptionalDate(raw: unknown, label: string): Date | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw AuditErrors.validationFailed(`${label} must be an ISO timestamp`);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw AuditErrors.validationFailed(`${label} must be an ISO timestamp`);
  }
  return date;
}

export function jsonHasForbiddenKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonHasForbiddenKeys(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
      const lower = key.toLowerCase();
      return (
        SECRET_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment)) ||
        jsonHasForbiddenKeys(nested)
      );
    });
  }
  return false;
}

export function assertSnapshotSize(snapshot: Record<string, unknown> | null | undefined): void {
  if (!snapshot) {
    return;
  }
  if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > SNAPSHOT_MAX_BYTES) {
    throw AuditErrors.payloadTooLarge();
  }
}

export function assertNoSecrets(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): void {
  if (jsonHasForbiddenKeys(before) || jsonHasForbiddenKeys(after)) {
    throw AuditErrors.secretKeyForbidden();
  }
}
