import type { InventoryOverviewRow } from '@/services/inventory';
import type { InventoryFilter } from './InventoryScreen.content';

export function formatPaise(paise: number | null | undefined): string {
  if (paise == null) {
    return '—';
  }
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatQty(qty: number, unit: string): string {
  const rounded = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '');
  const label = unit.toLowerCase().replaceAll('_', ' ');
  return `${rounded} ${label}`;
}

export function formatExpiry(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function productMeta(row: InventoryOverviewRow): string {
  const salt = row.genericName?.trim() || row.brandName?.trim() || '';
  const mfr = row.manufacturerName?.trim() || '';
  if (salt && mfr) {
    return `${salt} · ${mfr}`;
  }
  return salt || mfr || row.sku;
}

export function scheduleLabel(row: InventoryOverviewRow): string {
  if (row.scheduleClassification) {
    return row.scheduleClassification === 'OTC' ? 'OTC' : row.scheduleClassification;
  }
  return row.prescriptionRequired ? 'Rx' : 'OTC';
}

export function matchesInventoryFilter(row: InventoryOverviewRow, filter: InventoryFilter): boolean {
  switch (filter) {
    case 'alerts':
      return row.lowStock || row.nearExpiry || row.expired || row.outOfStock;
    case 'low':
      return row.lowStock;
    case 'expiring':
      return row.nearExpiry || row.expired;
    case 'rx':
      return row.prescriptionRequired || (row.scheduleClassification != null && row.scheduleClassification !== 'OTC');
    case 'out':
      return row.outOfStock;
    case 'unallocated':
      return row.unallocated;
    case 'all':
    default:
      return true;
  }
}

export function matchesInventoryQuery(row: InventoryOverviewRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [row.name, row.genericName, row.brandName, row.manufacturerName, row.sku, row.categoryName]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(q));
}

export function downloadInventoryCsv(rows: InventoryOverviewRow[]): void {
  const header = [
    'Product',
    'Salt',
    'Manufacturer',
    'Category',
    'Schedule',
    'Rack',
    'Batches',
    'Expiry',
    'Stock',
    'MRP',
    'Value',
    'Loose',
  ];
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        csv(row.name),
        csv(row.genericName),
        csv(row.manufacturerName),
        csv(row.categoryName),
        csv(scheduleLabel(row)),
        csv(row.rackLocation),
        row.batchCount,
        csv(row.earliestExpiry),
        row.onHandQuantity,
        row.mrpPaise == null ? '' : (row.mrpPaise / 100).toFixed(2),
        (row.retailValuePaise / 100).toFixed(2),
        row.looseSellingEnabled ? 'yes' : 'no',
      ].join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csv(value: string | null | undefined): string {
  const raw = value ?? '';
  if (/[",\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}
