import { describe, expect, it } from 'vitest';
import {
  apiStatusHint,
  formatPaise,
  mapApiStatus,
  matchCompletedInvoice,
} from '../ReturnsScreen.utils';
import type { SalesInvoice } from '@/services/salesInvoices';

describe('returns helpers', () => {
  it('maps over-return and non-returnable codes', () => {
    expect(mapApiStatus({ status: 422, code: 'OVER_RETURN' })).toBe('validation');
    expect(apiStatusHint('OVER_RETURN')).toContain('still sold');
    expect(apiStatusHint('NOT_RETURNABLE')).toContain('not returnable');
    expect(mapApiStatus({ status: 409, code: 'IDEMPOTENCY_CONFLICT' })).toBe('conflict');
  });

  it('formats refund paise for the till', () => {
    expect(formatPaise(11200)).toBe('₹112');
  });

  it('matches a collected bill by number', () => {
    const invoice = {
      id: 'inv-1',
      invoiceNumber: 'INV/2026-27/BR01/00012',
      status: 'COMPLETED',
    } as SalesInvoice;
    expect(matchCompletedInvoice([invoice], 'inv/2026-27/br01/00012')?.id).toBe('inv-1');
    expect(matchCompletedInvoice([invoice], '')).toBeUndefined();
  });
});
