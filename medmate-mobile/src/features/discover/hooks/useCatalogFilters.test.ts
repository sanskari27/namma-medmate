import {
  catalogFilters,
  extractBrands,
  filterByBrand,
  filterProducts,
} from './useCatalogFilters';
import type { Product } from '@/types';

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: 'Test product',
    brand: 'Test brand',
    manufacturer: 'Test brand',
    category: 'fever',
    packSize: '1 tablet',
    mrp: 100,
    sellingPrice: 85,
    discountPercent: 15,
    requiresPrescription: false,
    isGenuine: true,
    pharmacyIds: ['hf'],
    ...overrides,
  };
}

const catalogue: Product[] = [
  product({ id: 'a', brand: 'Abbott', requiresPrescription: false, discountPercent: 15 }),
  product({ id: 'b', brand: 'Abbott', requiresPrescription: true, discountPercent: 16 }),
  product({ id: 'c', brand: 'Medley', requiresPrescription: false, discountPercent: 5 }),
  product({ id: 'd', brand: 'Medley', requiresPrescription: true, discountPercent: 20 }),
];

describe('filterProducts', () => {
  it('returns everything for the "all" filter', () => {
    expect(filterProducts(catalogue, 'all')).toHaveLength(4);
  });

  it('keeps only over-the-counter products', () => {
    const result = filterProducts(catalogue, 'no-rx');
    expect(result.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('keeps only prescription products', () => {
    const result = filterProducts(catalogue, 'rx');
    expect(result.map((p) => p.id)).toEqual(['b', 'd']);
  });

  it('keeps products discounted by 15% or more', () => {
    const result = filterProducts(catalogue, 'discount');
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'd']);
  });

  it('exposes a label for every filter', () => {
    expect(catalogFilters.map((f) => f.id)).toEqual(['all', 'no-rx', 'rx', 'discount']);
    catalogFilters.forEach((filter) => {
      expect(filter.label.length).toBeGreaterThan(0);
    });
  });
});

describe('extractBrands', () => {
  it('counts the products per brand', () => {
    expect(extractBrands(catalogue)).toEqual([
      { name: 'Abbott', count: 2 },
      { name: 'Medley', count: 2 },
    ]);
  });

  it('sorts by count, then alphabetically', () => {
    const brands = extractBrands([
      product({ id: 'x', brand: 'Zed' }),
      product({ id: 'y', brand: 'Alpha' }),
      product({ id: 'z', brand: 'Alpha' }),
    ]);
    expect(brands).toEqual([
      { name: 'Alpha', count: 2 },
      { name: 'Zed', count: 1 },
    ]);
  });

  it('ignores blank brand names', () => {
    expect(extractBrands([product({ id: 'x', brand: '   ' })])).toEqual([]);
  });
});

describe('filterByBrand', () => {
  it('returns everything when no brand is selected', () => {
    expect(filterByBrand(catalogue, null)).toHaveLength(4);
  });

  it('narrows to the chosen brand', () => {
    expect(filterByBrand(catalogue, 'Medley').map((p) => p.id)).toEqual(['c', 'd']);
  });
});
