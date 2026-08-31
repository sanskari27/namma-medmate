import { Patterns } from '@namma-medmate/constants';

export function encodeCursor(tenantId: string): string {
  return Buffer.from(tenantId, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) {
    return undefined;
  }
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  return Patterns.uuid.test(decoded) ? decoded : undefined;
}
