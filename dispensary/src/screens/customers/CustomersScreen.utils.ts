import type { CustomerDirectoryItem } from '@/services/customers';
import type { CreditLedgerEntry } from '@/services/credit';
import { ROUTES } from '@/libs/constants/routes.const';
import { CUSTOMERS_CONTENT } from './CustomersScreen.content';

export type CustomersSort = 'spenders' | 'orders' | 'recent';

export type CustomersPageStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'denied';

export type CustomersActionStatus =
  | null
  | 'success'
  | 'settled'
  | 'failure'
  | 'validation'
  | 'conflict';

export type CustomersSummary = {
  customerCount: number;
  hasWalkIns: boolean;
  lifetimePaise: number;
  repeatCount: number;
  chronicCount: number;
  creditOutstandingPaise: number;
};

export const WALK_IN_KEY = '__walk_in__';

export function rowKey(row: CustomerDirectoryItem): string {
  return row.walkInAggregate ? WALK_IN_KEY : (row.id ?? '');
}

export function hasCrmAccess(modules: string[] | undefined): boolean {
  return modules?.includes('CRM') === true;
}

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
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

export function formatIstDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
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

export function matchesQuery(row: CustomerDirectoryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [row.name, row.phone ?? '', row.email ?? ''].join(' ').toLowerCase();
  return haystack.includes(q);
}

export function sortedCustomers(
  items: CustomerDirectoryItem[],
  sort: CustomersSort,
  query: string,
): CustomerDirectoryItem[] {
  const filtered = items.filter((row) => matchesQuery(row, query));
  const walkIns = filtered.filter((row) => row.walkInAggregate);
  const named = filtered.filter((row) => !row.walkInAggregate);
  named.sort((a, b) => {
    if (sort === 'orders') {
      return b.orderCount - a.orderCount || b.lifetimeValuePaise - a.lifetimeValuePaise;
    }
    if (sort === 'recent') {
      const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
      const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
      return bTime - aTime || b.lifetimeValuePaise - a.lifetimeValuePaise;
    }
    return b.lifetimeValuePaise - a.lifetimeValuePaise || b.orderCount - a.orderCount;
  });
  return [...walkIns, ...named];
}

export function summaryStats(items: CustomerDirectoryItem[]): CustomersSummary {
  const named = items.filter((row) => !row.walkInAggregate);
  const hasWalkIns = items.some((row) => row.walkInAggregate && row.orderCount > 0);
  return {
    customerCount: named.length,
    hasWalkIns,
    lifetimePaise: items.reduce((sum, row) => sum + row.lifetimeValuePaise, 0),
    repeatCount: named.filter((row) => row.orderCount >= 2).length,
    chronicCount: named.filter((row) => row.chronicRx).length,
    creditOutstandingPaise: named.reduce((sum, row) => sum + Math.max(0, row.creditDuePaise), 0),
  };
}

export function creditTotals(entries: CreditLedgerEntry[]): {
  givenPaise: number;
  repaidPaise: number;
} {
  let givenPaise = 0;
  let repaidPaise = 0;
  for (const entry of entries) {
    if (entry.type === 'SALE_CHARGE') givenPaise += Math.abs(entry.amountPaise);
    if (entry.type === 'SETTLEMENT') repaidPaise += Math.abs(entry.amountPaise);
  }
  return { givenPaise, repaidPaise };
}

export function ledgerLabel(entry: CreditLedgerEntry): { title: string; subtitle: string } {
  if (entry.type === 'SETTLEMENT') {
    const mode = entry.settlementMode ? entry.settlementMode.split('_').join(' ') : 'Repayment';
    return {
      title: `Repayment · ${mode}`,
      subtitle: entry.settlementReference ?? 'CR',
    };
  }
  if (entry.type === 'SALE_CHARGE') {
    return {
      title: 'Credit bill',
      subtitle: entry.invoiceId ? entry.invoiceId.slice(0, 8).toUpperCase() : 'INV',
    };
  }
  return {
    title: 'Limit set',
    subtitle: CUSTOMERS_CONTENT.detail.creditAccount,
  };
}

export function whatsappHref(phone: string | null | undefined, amountPaise: number): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Reminder from your pharmacy: outstanding khata balance is ${formatPaise(amountPaise)}.`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export function smsHref(phone: string | null | undefined, amountPaise: number): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const body = encodeURIComponent(
    `Reminder: outstanding khata balance is ${formatPaise(amountPaise)}.`,
  );
  return `sms:${digits.length === 10 ? digits : digits.slice(-10)}?body=${body}`;
}

export type CustomerExportRow = {
  name: string;
  phone: string;
  orders: string;
  online: string;
  store: string;
  channel: string;
  units: string;
  lastVisit: string;
  lastVisitAbsolute: string;
  loyalty: string;
  lifetime: string;
  creditDue: string;
  chronic: string;
};

function escapeHtml(value: string): string {
  return value
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;');
}

export function toCustomerExportRows(
  rows: CustomerDirectoryItem[],
  now = Date.now(),
): CustomerExportRow[] {
  return rows.map((row) => ({
    name: row.name,
    phone: formatPhone(row.phone),
    orders: String(row.orderCount),
    online: String(row.onlineOrders),
    store: String(row.storeOrders),
    channel: `${row.onlineOrders} online · ${row.storeOrders} store`,
    units: String(row.unitsSold),
    lastVisit: relativeTime(row.lastVisitAt, now),
    lastVisitAbsolute: formatIstDateTime(row.lastVisitAt),
    loyalty: CUSTOMERS_CONTENT.pts(row.loyaltyPoints),
    lifetime: formatPaise(row.lifetimeValuePaise),
    creditDue: row.creditDuePaise > 0 ? formatPaise(row.creditDuePaise) : '—',
    chronic: row.chronicRx ? CUSTOMERS_CONTENT.rx : '—',
  }));
}

const EXPORT_HEADERS = [
  CUSTOMERS_CONTENT.columns.customer,
  CUSTOMERS_CONTENT.columns.phone,
  CUSTOMERS_CONTENT.columns.orders,
  'Online',
  'Store',
  CUSTOMERS_CONTENT.columns.units,
  CUSTOMERS_CONTENT.columns.lastVisit,
  'Last visit (IST)',
  CUSTOMERS_CONTENT.columns.loyalty,
  CUSTOMERS_CONTENT.columns.lifetime,
  'Credit due',
  'Chronic Rx',
] as const;

function exportCells(row: CustomerExportRow): string[] {
  return [
    row.name,
    row.phone,
    row.orders,
    row.online,
    row.store,
    row.units,
    row.lastVisit,
    row.lastVisitAbsolute,
    row.loyalty,
    row.lifetime,
    row.creditDue,
    row.chronic,
  ];
}

export function buildCustomersExcelHtml(rows: CustomerDirectoryItem[]): string {
  const exported = toCustomerExportRows(rows);
  const generated = formatIstDateTime(new Date().toISOString());
  const head = EXPORT_HEADERS.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
  const body = exported
    .map((row) => {
      const cells = exportCells(row)
        .map((value, index) => {
          const align = index >= 2 && index <= 5 ? 'right' : 'left';
          return `<td style="mso-number-format:'\\@';text-align:${align}">${escapeHtml(value)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Customers</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  th { background: #1b3d29; color: #fff; font-weight: 700; padding: 8px 10px; border: 1px solid #11331f; text-align: left; }
  td { padding: 7px 10px; border: 1px solid #cfe0d6; vertical-align: top; }
  tr:nth-child(even) td { background: #f0faf4; }
  h1 { font-family: Calibri, Arial, sans-serif; color: #11331f; font-size: 18pt; margin: 0 0 4px; }
  .meta { color: #5d7a6b; font-size: 10pt; margin-bottom: 14px; }
</style>
</head>
<body>
  <h1>${escapeHtml(CUSTOMERS_CONTENT.regionLabel)}</h1>
  <div class="meta">${escapeHtml(CUSTOMERS_CONTENT.subtitle)} · Generated ${escapeHtml(generated)} · ${exported.length} row(s)</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || `<tr><td colspan="${EXPORT_HEADERS.length}">No customers</td></tr>`}</tbody>
  </table>
</body>
</html>`;
}

export function buildCustomersPdfHtml(rows: CustomerDirectoryItem[]): string {
  const exported = toCustomerExportRows(rows);
  const generated = formatIstDateTime(new Date().toISOString());
  const head = [
    CUSTOMERS_CONTENT.columns.customer,
    CUSTOMERS_CONTENT.columns.phone,
    CUSTOMERS_CONTENT.columns.orders,
    CUSTOMERS_CONTENT.columns.channel,
    CUSTOMERS_CONTENT.columns.units,
    CUSTOMERS_CONTENT.columns.lastVisit,
    CUSTOMERS_CONTENT.columns.loyalty,
    CUSTOMERS_CONTENT.columns.lifetime,
    'Credit due',
  ]
    .map((label) => `<th>${escapeHtml(label)}</th>`)
    .join('');
  const body = exported
    .map((row) => {
      const lastVisitCell = `${escapeHtml(row.lastVisit)}<br/><span class="sub">${escapeHtml(row.lastVisitAbsolute)}</span>`;
      const cells = [
        escapeHtml(row.name),
        escapeHtml(row.phone),
        escapeHtml(row.orders),
        escapeHtml(row.channel),
        escapeHtml(row.units),
        lastVisitCell,
        escapeHtml(row.loyalty),
        escapeHtml(row.lifetime),
        escapeHtml(row.creditDue),
      ]
        .map((value, index) => {
          const align = index === 2 || index === 4 || index === 7 || index === 8 ? 'num' : '';
          return `<td class="${align}">${value}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(CUSTOMERS_CONTENT.regionLabel)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, system-ui, sans-serif; color: #16241c; }
  h1 { margin: 0 0 4px; font-size: 20px; color: #11331f; }
  .meta { margin: 0 0 16px; color: #5d7a6b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1b3d29; color: #fff; text-align: left; padding: 8px 8px; border: 1px solid #11331f; }
  td { padding: 7px 8px; border: 1px solid #d5e3db; vertical-align: top; }
  tr:nth-child(even) td { background: #f4faf6; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sub { color: #5d7a6b; font-size: 10px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(CUSTOMERS_CONTENT.regionLabel)}</h1>
  <p class="meta">${escapeHtml(CUSTOMERS_CONTENT.subtitle)} · Generated ${escapeHtml(generated)} · ${exported.length} row(s)</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="9">No customers</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

export function downloadCustomersExcel(rows: CustomerDirectoryItem[]): void {
  const html = buildCustomersExcelHtml(rows);
  const blob = new Blob([`\uFEFF${html}`], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `customers-${stamp}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadCustomersPdf(rows: CustomerDirectoryItem[]): void {
  const html = buildCustomersPdfHtml(rows);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', CUSTOMERS_CONTENT.regionLabel);
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `customers-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  frameWindow.addEventListener('afterprint', cleanup);
  window.setTimeout(() => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      cleanup();
      return;
    }
    // Safari / some Chromium builds skip afterprint.
    window.setTimeout(cleanup, 60_000);
  }, 300);
}

export function posSaleHref(row: {
  id: string | null;
  walkInAggregate: boolean;
}): string {
  if (row.walkInAggregate) {
    return `${ROUTES.SALES}?walkIn=1`;
  }
  if (row.id) {
    return `${ROUTES.SALES}?customer=${encodeURIComponent(row.id)}`;
  }
  return ROUTES.SALES;
}
