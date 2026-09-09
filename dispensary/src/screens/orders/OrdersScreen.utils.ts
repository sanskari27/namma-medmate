import type { SalesOrderRow } from '@/services/salesOrders';
import { ORDERS_CONTENT } from './OrdersScreen.content';

export type OrdersFilter = 'all' | 'online' | 'counter' | 'needsAction' | 'unpaid';

export type OrdersFilterCounts = Record<OrdersFilter, number>;

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

export function formatIstDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function statusLabel(status: SalesOrderRow['status']): string {
  return ORDERS_CONTENT.status[status];
}

export function statusTone(status: SalesOrderRow['status']): 'gold' | 'blue' | 'green' {
  if (status === 'DRAFT') return 'gold';
  if (status === 'HELD') return 'blue';
  return 'green';
}

export function isUnpaid(row: SalesOrderRow): boolean {
  return row.amountDuePaise > 0;
}

export function needsAction(row: SalesOrderRow): boolean {
  return row.status === 'DRAFT' || row.status === 'HELD';
}

export function matchesFilter(row: SalesOrderRow, filter: OrdersFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'online':
      return row.channel === 'ONLINE';
    case 'counter':
      return row.channel === 'COUNTER';
    case 'needsAction':
      return needsAction(row);
    case 'unpaid':
      return isUnpaid(row);
    default:
      return true;
  }
}

export function matchesQuery(row: SalesOrderRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.invoiceNumber,
    row.customerName,
    row.customerPhone ?? '',
    row.itemSummary,
    row.prescriptionReference ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterCounts(items: SalesOrderRow[]): OrdersFilterCounts {
  return {
    all: items.length,
    online: items.filter((row) => row.channel === 'ONLINE').length,
    counter: items.filter((row) => row.channel === 'COUNTER').length,
    needsAction: items.filter(needsAction).length,
    unpaid: items.filter(isUnpaid).length,
  };
}

export function filteredOrders(
  items: SalesOrderRow[],
  filter: OrdersFilter,
  query: string,
): SalesOrderRow[] {
  return items.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query));
}

export function customerMeta(row: SalesOrderRow, now = Date.now()): string {
  const parts = [relativeTime(row.createdAt, now)];
  if (row.customerPhone) parts.push(row.customerPhone);
  return parts.filter(Boolean).join(' · ');
}

export function unitsLabel(row: SalesOrderRow): string {
  return ORDERS_CONTENT.units(row.itemUnitCount);
}

export function gstLabel(row: SalesOrderRow): string {
  const taxable = Math.max(0, row.totalPaise - row.taxPaise);
  return `${formatPaise(row.taxPaise)} (${formatPaise(taxable)} taxable)`;
}

export function itemsFactLabel(row: SalesOrderRow): string {
  return `${row.itemUnitCount} units · ${row.lineCount} lines`;
}

export function channelLabel(channel: SalesOrderRow['channel']): string {
  return ORDERS_CONTENT.channel[channel];
}

export function historyEvents(row: SalesOrderRow): { label: string; detail: string; future: boolean }[] {
  const created = `${formatIstDateTime(row.createdAt)} · ${relativeTime(row.createdAt)}`;
  if (row.status === 'DRAFT') {
    return [
      { label: 'Draft opened', detail: created, future: false },
      { label: 'Completed', detail: 'Pending', future: true },
    ];
  }
  if (row.status === 'HELD') {
    return [
      { label: 'Draft opened', detail: created, future: false },
      {
        label: 'Held',
        detail: `${formatIstDateTime(row.updatedAt)} · ${relativeTime(row.updatedAt)}`,
        future: false,
      },
      { label: 'Completed', detail: 'Pending', future: true },
    ];
  }
  return [
    { label: 'Draft opened', detail: created, future: false },
    {
      label: 'Completed',
      detail: row.completedAt
        ? `${formatIstDateTime(row.completedAt)} · ${relativeTime(row.completedAt)}`
        : formatIstDateTime(row.updatedAt),
      future: false,
    },
  ];
}
