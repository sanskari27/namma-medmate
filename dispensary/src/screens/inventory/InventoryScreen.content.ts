export const INVENTORY_CONTENT = {
  title: 'Inventory',
  subtitle: 'Stock, batches & expiry',
  searchPlaceholder: 'Search by name, salt, brand…',
  excel: 'Excel',
  pdf: 'PDF',
  rackLocations: 'Rack & Locations',
  addStock: 'Add stock via purchase',
  addProduct: 'Add product',
  receiveStock: 'Receive stock',
  edit: 'Edit',
  loadFailed: 'Could not load inventory for this outlet.',
  noBranch: 'Select an outlet before managing floor stock.',
  empty: 'No products on this outlet catalogue yet.',
  noSkus: 'No SKUs yet.',
  emptyFilter: 'No products match this filter.',
  toggleFailed: 'Could not update that listing flag.',
  filters: {
    all: 'All',
    alerts: 'Alerts',
    low: 'Low stock',
    expiring: 'Expiring',
    rx: 'Rx-only',
    out: 'Out of stock',
    unallocated: 'Unallocated',
  },
  kpis: {
    totalSkus: 'Total SKUs',
    stockValue: 'Stock value (cost)',
    retailValue: 'Retail value (MRP)',
    lowStock: 'Low on stock',
    expiring: 'Expiring ≤ 4 mo',
    deadStock: 'Dead stock (90d)',
  },
  columns: {
    product: 'Product',
    category: 'Category',
    schedule: 'Schedule',
    rack: 'Rack',
    batches: 'Batches · Expiry',
    stock: 'Stock',
    mrp: 'MRP',
    value: 'Value',
    loose: 'Loose',
    online: 'Online',
  },
} as const;

export type InventoryFilter =
  | 'all'
  | 'alerts'
  | 'low'
  | 'expiring'
  | 'rx'
  | 'out'
  | 'unallocated';
