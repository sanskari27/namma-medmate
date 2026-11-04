import {
  mockCategories,
  mockPharmacies,
  mockPharmacyStrip,
  mockPriceOverrides,
  mockProducts,
} from './data';

/**
 * Catalogue integrity.
 *
 * The mock data is the contract the backend will honour, so it has to hold
 * together: every reference resolves, every price is consistent with its
 * discount, and nothing is orphaned.
 */
describe('mock catalogue', () => {
  const pharmacyIds = new Set(mockPharmacies.map((p) => p.id));

  it('has unique ids for categories, pharmacies and products', () => {
    expect(new Set(mockCategories.map((c) => c.id)).size).toBe(mockCategories.length);
    expect(new Set(mockPharmacies.map((p) => p.id)).size).toBe(mockPharmacies.length);
    expect(new Set(mockProducts.map((p) => p.id)).size).toBe(mockProducts.length);
  });

  it('references only pharmacies that exist', () => {
    for (const product of mockProducts) {
      for (const id of product.pharmacyIds) {
        expect(pharmacyIds.has(id)).toBe(true);
      }
    }
  });

  it('references only categories that exist', () => {
    const categoryIds = new Set(mockCategories.map((c) => c.id));
    for (const product of mockProducts) {
      expect(categoryIds.has(product.category)).toBe(true);
    }
  });

  it('prices every product below its MRP', () => {
    for (const product of mockProducts) {
      expect(product.sellingPrice).toBeLessThan(product.mrp);
      expect(product.sellingPrice).toBeGreaterThan(0);
    }
  });

  it('keeps the stated discount consistent with the two prices', () => {
    for (const product of mockProducts) {
      const actual = Math.round(
        ((product.mrp - product.sellingPrice) / product.mrp) * 100,
      );
      expect(actual).toBe(product.discountPercent);
    }
  });

  it('only overrides prices for products and pharmacies that exist', () => {
    const productIds = new Set(mockProducts.map((p) => p.id));
    for (const [productId, prices] of Object.entries(mockPriceOverrides)) {
      expect(productIds.has(productId)).toBe(true);
      for (const pharmacyId of Object.keys(prices)) {
        expect(pharmacyIds.has(pharmacyId)).toBe(true);
      }
    }
  });

  it('ships an image strip for every pharmacy', () => {
    for (const pharmacy of mockPharmacies) {
      expect(mockPharmacyStrip[pharmacy.id]?.length).toBe(3);
    }
  });

  it('gives every category a label', () => {
    for (const category of mockCategories) {
      expect(category.label.length).toBeGreaterThan(0);
    }
  });

  it('covers every pharmacy with at least one product', () => {
    for (const id of pharmacyIds) {
      const stocked = mockProducts.filter((p) => p.pharmacyIds.includes(id));
      expect(stocked.length).toBeGreaterThan(0);
    }
  });
});
