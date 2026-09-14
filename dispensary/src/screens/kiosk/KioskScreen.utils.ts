import type { InventoryOverviewRow } from '@/services/inventory';
import type { KioskConfig, KioskPaymentMethod, KioskState } from '@/services/kiosk';
import { KIOSK_CONTENT } from './KioskScreen.content';

export type PageStatus =
  | 'loading'
  | 'idle'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'quota'
  | 'retail'
  | null;

export type CartLine = {
  productId: string;
  name: string;
  packLabel: string;
  unitPricePaise: number;
  looseUnitPaise: number | null;
  loose: boolean;
  prescriptionRequired: boolean;
  quantity: number;
  categoryName: string;
  icon: string;
};

export function defaultConfig(branchName?: string | null): KioskConfig {
  return {
    displayName: branchName ? `${branchName} — Self Order` : 'Self Order',
    welcomeMessage: 'Tap to order your medicines & wellness products',
    staffExitPin: '0000',
    idleResetSeconds: 60,
    accentTheme: 'green',
    showPrices: true,
    allowRxUpload: true,
    acceptCash: true,
    acceptUpi: true,
    acceptCard: true,
    acceptCod: false,
  };
}

export function hasKioskAccess(modules: string[] | undefined): boolean {
  return modules?.includes('KIOSK') ?? false;
}

export function mapBlockReason(state: KioskState | null): PageStatus {
  if (!state) return 'failure';
  if (!state.hasModule) return 'denied';
  if (state.blockReason === 'NO_ACTIVE_BRANCH') return 'empty';
  if (state.blockReason === 'PLAN_LIMIT') return 'quota';
  if (state.blockReason === 'BRANCH_TYPE') return 'retail';
  return null;
}

export function mapApiStatus(error: { status?: number; code?: string }): PageStatus {
  if (error.status === 403) return 'denied';
  if (error.status === 409) return 'conflict';
  if (error.code === 'PLAN_LIMIT') return 'quota';
  if (error.code === 'BRANCH_TYPE') return 'retail';
  if (error.code === 'NO_ACTIVE_BRANCH') return 'empty';
  if (error.status === 400) return 'validation';
  return 'failure';
}

export function statusCopy(status: PageStatus): string | null {
  if (!status || status === 'idle' || status === 'loading') return null;
  return KIOSK_CONTENT.status[status] ?? null;
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function packLabel(row: InventoryOverviewRow): string {
  if (row.packSize > 1) {
    return `${row.packUnit} of ${row.packSize}`;
  }
  return row.packUnit || row.baseUnit || 'Pack';
}

export function productIcon(row: InventoryOverviewRow): string {
  if (row.categoryIcon?.trim()) return row.categoryIcon.trim();
  if (row.prescriptionRequired) return '💊';
  return '🧴';
}

export function toCartLine(row: InventoryOverviewRow, loose = false): CartLine {
  const unit =
    loose && row.looseSellingEnabled && row.looseUnitPaise != null
      ? row.looseUnitPaise
      : (row.mrpPaise ?? 0);
  return {
    productId: row.productId,
    name: row.name,
    packLabel: loose
      ? `1 ${row.baseUnit.toLowerCase()}`
      : packLabel(row),
    unitPricePaise: unit,
    looseUnitPaise: row.looseUnitPaise,
    loose,
    prescriptionRequired: row.prescriptionRequired,
    quantity: 1,
    categoryName: row.categoryName ?? 'Other',
    icon: productIcon(row),
  };
}

export function catalogueForKiosk(rows: InventoryOverviewRow[]): InventoryOverviewRow[] {
  const inStock = rows.filter((row) => !row.outOfStock && row.onHandQuantity > 0);
  // Prefer online-listed when available; otherwise show in-stock so the kiosk is usable.
  const online = inStock.filter((row) => row.onlineListed);
  return online.length > 0 ? online : inStock;
}

export function matchesQuery(row: InventoryOverviewRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.genericName, row.brandName, row.sku, row.categoryName]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function categoryNames(rows: InventoryOverviewRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.categoryName?.trim()) set.add(row.categoryName.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function cartTotalPaise(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPricePaise * line.quantity, 0);
}

export function cartHasRx(lines: CartLine[]): boolean {
  return lines.some((line) => line.prescriptionRequired);
}

export function enabledPayments(config: KioskConfig): KioskPaymentMethod[] {
  const out: KioskPaymentMethod[] = [];
  if (config.acceptUpi) out.push('UPI');
  if (config.acceptCard) out.push('CARD');
  if (config.acceptCash) out.push('CASH');
  if (config.acceptCod) out.push('COD');
  return out.length > 0 ? out : ['CASH'];
}

export function paymentLabel(method: KioskPaymentMethod): string {
  switch (method) {
    case 'UPI':
      return KIOSK_CONTENT.upi;
    case 'CARD':
      return KIOSK_CONTENT.card;
    case 'COD':
      return KIOSK_CONTENT.cod;
    default:
      return KIOSK_CONTENT.cash;
  }
}
