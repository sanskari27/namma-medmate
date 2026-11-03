import type { Product } from '@/types';

/**
 * The prescription / discount filters offered on the category screen.
 */
export type CatalogFilter = 'all' | 'no-rx' | 'rx' | 'discount';

export const catalogFilters: { id: CatalogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'no-rx', label: 'No prescription' },
  { id: 'rx', label: 'Prescription' },
  { id: 'discount', label: '15% off and more' },
];

/** Apply the selected filter to a product list. */
export function filterProducts(products: Product[], filter: CatalogFilter): Product[] {
  switch (filter) {
    case 'no-rx':
      return products.filter((p) => !p.requiresPrescription);
    case 'rx':
      return products.filter((p) => p.requiresPrescription);
    case 'discount':
      return products.filter((p) => p.discountPercent >= 15);
    case 'all':
    default:
      return products;
  }
}

export interface BrandCount {
  name: string;
  count: number;
}

/** The brand list shown under the filter chips, with counts. */
export function extractBrands(products: Product[]): BrandCount[] {
  const counts = new Map<string, number>();

  for (const product of products) {
    const name = product.brand.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Narrow a product list to one brand. */
export function filterByBrand(products: Product[], brand: string | null): Product[] {
  if (!brand) return products;
  return products.filter((p) => p.brand === brand);
}
