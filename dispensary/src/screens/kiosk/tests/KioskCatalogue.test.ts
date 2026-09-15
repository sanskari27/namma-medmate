import { describe, expect, it } from 'vitest';
import { catalogueForKiosk } from '../KioskScreen.utils';
import type { InventoryOverviewRow } from '@/services/inventory';

function row(partial: Partial<InventoryOverviewRow>): InventoryOverviewRow {
  return {
    productId: 'p1',
    sku: 'SKU',
    name: 'Crocin',
    genericName: null,
    brandName: null,
    manufacturerName: null,
    categoryId: 'c1',
    categoryName: 'OTC',
    categoryIcon: null,
    scheduleClassification: null,
    prescriptionRequired: false,
    rackLocation: null,
    baseUnit: 'Tablet',
    packUnit: 'strip',
    packSize: 10,
    batchCount: 1,
    earliestExpiry: null,
    expired: false,
    nearExpiry: false,
    onHandQuantity: 4,
    lowStock: false,
    outOfStock: false,
    mrpPaise: 1200,
    costValuePaise: 0,
    retailValuePaise: 0,
    looseUnitPaise: null,
    looseSellingEnabled: false,
    onlineListed: false,
    unallocated: false,
    deadStock: false,
    ...partial,
  };
}

describe('kiosk catalogue', () => {
  it('keeps in-stock rows even when none are online-listed', () => {
    const listed = row({ productId: 'online', onlineListed: true, onHandQuantity: 0, outOfStock: true });
    const shelf = row({ productId: 'shelf', onlineListed: false, onHandQuantity: 3, outOfStock: false });
    expect(catalogueForKiosk([listed, shelf]).map((item) => item.productId)).toEqual(['shelf']);
  });
});
