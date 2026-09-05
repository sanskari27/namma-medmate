import { describe, expect, it } from 'vitest';
import {
  canEdit,
  compareVersions,
  emptyForm,
  hasPurchaseAccess,
  toLineInputs,
  validateForm,
} from '../PurchasesScreen.utils';
import type { PurchaseOrderVersion } from '@/services/purchaseOrders';

describe('purchases helpers', () => {
  it('grants purchases module only', () => {
    expect(hasPurchaseAccess(['PROCUREMENT'])).toBe(true);
    expect(hasPurchaseAccess(['FINANCE'])).toBe(false);
    expect(hasPurchaseAccess(['SALES'])).toBe(false);
  });

  it('requires stockist and a priced line', () => {
    expect(validateForm(emptyForm)).toBe(false);
    expect(
      validateForm({
        ...emptyForm,
        supplierId: 's1',
        lines: [{ productId: 'p1', quantity: '10', rateRupees: '100' }],
      }),
    ).toBe(true);
    expect(
      toLineInputs({
        ...emptyForm,
        supplierId: 's1',
        lines: [{ productId: 'p1', quantity: '10', rateRupees: '100' }],
      }),
    ).toEqual([{ productId: 'p1', quantity: 10, unitRatePaise: 10000 }]);
  });

  it('blocks quantity edits after close or cancel', () => {
    expect(canEdit('DRAFT')).toBe(true);
    expect(canEdit('ISSUED')).toBe(true);
    expect(canEdit('CLOSED')).toBe(false);
    expect(canEdit('CANCELLED')).toBe(false);
  });

  it('marks changed lines when comparing versions', () => {
    const v1: PurchaseOrderVersion = {
      version: 1,
      createdAt: '2026-09-05T00:00:00Z',
      changedByUserId: 'u1',
      status: 'DRAFT',
      totalPaise: 112000,
      snapshot: {
        lines: [
          {
            productId: 'p1',
            productName: 'Crocin Advance',
            sku: 'CROCIN',
            quantity: '10',
            unitRatePaise: 10000,
            lineTotalPaise: 112000,
          },
        ],
      },
    };
    const v2: PurchaseOrderVersion = {
      ...v1,
      version: 2,
      totalPaise: 224000,
      snapshot: {
        lines: [
          {
            productId: 'p1',
            productName: 'Crocin Advance',
            sku: 'CROCIN',
            quantity: '20',
            unitRatePaise: 10000,
            lineTotalPaise: 224000,
          },
        ],
      },
    };
    const rows = compareVersions(v1, v2);
    expect(rows[0]?.changed).toBe(true);
    expect(rows[0]?.leftQty).toBe('10');
    expect(rows[0]?.rightQty).toBe('20');
  });
});
