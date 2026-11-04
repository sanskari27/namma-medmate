/**
 * `02 · Discover` — the browsing half of the app.
 *
 * Seven Figma frames, six route screens:
 *
 *   06 Home            → `/home`
 *   07 Search          → `/search`
 *   08 Category        → `/category/:id`
 *   09 Product         → `/product/:id`
 *   10 Product · Rx    → `/product/:id`  (the Rx state of the same screen)
 *   11 Pharmacies      → `/pharmacies`
 *   12 Pharmacy        → `/pharmacy/:id`
 *
 * Nothing outside this folder imports from it — the route wrappers in
 * `app/(app)/` are the only entry points.
 */

export {
  CategoryScreen,
  HomeScreen,
  PharmaciesScreen,
  PharmacyScreen,
  ProductScreen,
  SearchScreen,
} from './screens';

export { homeCategoryGrid, homeHeader, productRail } from './constants';

export {
  catalogFilters,
  extractBrands,
  filterByBrand,
  filterProducts,
  useFlashCountdown,
} from './hooks';
export type { BrandCount, CatalogFilter, Countdown } from './hooks';
