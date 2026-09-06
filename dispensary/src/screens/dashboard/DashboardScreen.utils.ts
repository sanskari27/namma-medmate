import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { hasFinanceAccess } from '@/libs/financeAccess';
import type { AuthUser } from '@/store';
import type {
  DashboardRole,
  DashboardView,
  DashboardWidget,
  OwnerDesk,
} from '@/services/dashboards';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type OutletScope = 'session' | 'tenant';

export type DashboardDesk = DashboardRole;

export const DESK_ORDER: DashboardDesk[] = ['owner', 'cashier', 'inventory', 'accountant'];

export const DESK_LABEL: Record<DashboardDesk, string> = {
  cashier: 'Till today',
  inventory: 'Stock desk',
  accountant: 'Khata and spend',
  owner: 'Shop glance',
};

export const DESK_BLURB: Record<DashboardDesk, string> = {
  cashier: "Today's takings and held bills at this outlet.",
  inventory: 'Low stock, transfers, and deliveries waiting on this outlet.',
  accountant: 'Khata, stockist dues, and spend — not till work.',
  owner: 'Sales, stock, licences, and books. Each strip shows when it was taken.',
};

export { hasFinanceAccess };

export function clientPermittedDesks(user: AuthUser | null | undefined): DashboardDesk[] {
  if (!user) {
    return [];
  }
  if (user.role === 'pharmacy_owner') {
    return ['owner', 'cashier', 'inventory', 'accountant'];
  }
  const desks: DashboardDesk[] = [];
  if (user.modules?.includes('SALES')) {
    desks.push('cashier');
  }
  if (user.modules?.includes('INVENTORY')) {
    desks.push('inventory');
  }
  if (hasFinanceAccess(user.role, user.roles)) {
    desks.push('accountant');
  }
  return desks;
}

export function defaultDesk(user: AuthUser | null | undefined): DashboardDesk | null {
  const permitted = clientPermittedDesks(user);
  if (permitted.includes('owner')) {
    return 'owner';
  }
  return permitted[0] ?? null;
}

export function uniqueDesks(roles: string[]): DashboardDesk[] {
  const seen = new Set<DashboardDesk>();
  for (const raw of roles) {
    if (raw === 'cashier' || raw === 'inventory' || raw === 'accountant' || raw === 'owner') {
      seen.add(raw);
    }
  }
  return DESK_ORDER.filter((desk) => seen.has(desk));
}

export function isEmptyView(desk: DashboardDesk, view: DashboardView | null): boolean {
  if (!view) {
    return false;
  }
  if (desk === 'cashier' && view.cashier) {
    return view.cashier.todayBillCount === 0 && view.cashier.holds.length === 0;
  }
  if (desk === 'inventory' && view.inventory) {
    return (
      view.inventory.lowStock.length === 0 &&
      view.inventory.pendingTransfers.length === 0 &&
      view.inventory.pendingGrn.length === 0
    );
  }
  if (desk === 'accountant' && view.accountant) {
    return (
      view.accountant.receivablesTotalPaise === 0 &&
      view.accountant.payablesTotalPaise === 0 &&
      view.accountant.expenseTotalPaise === 0
    );
  }
  if (desk === 'owner' && view.owner) {
    return isEmptyOwnerDesk(view.owner);
  }
  return false;
}

export function emptyCopy(desk: DashboardDesk): string {
  switch (desk) {
    case 'cashier':
      return 'No completed bills today. Held bills stay on this till until collected.';
    case 'inventory':
      return 'No low stock, transfers, or deliveries waiting on this outlet.';
    case 'accountant':
      return 'Khata, stockist dues, and spend are clear for this view.';
    case 'owner':
      return 'No sales, stock alerts, licences, or books for this view.';
    default:
      return 'Nothing waiting on this desk.';
  }
}

export function successCopy(desk: DashboardDesk): string {
  switch (desk) {
    case 'cashier':
      return "Today's till at this outlet.";
    case 'inventory':
      return 'Stock work waiting on this outlet.';
    case 'accountant':
      return 'Khata and spend for this view.';
    case 'owner':
      return 'Shop glance with as-of time on every strip.';
    default:
      return 'Desk loaded for this outlet.';
  }
}

export function statusCopy(
  status: PageStatus,
  desk: DashboardDesk | null,
  hint?: string | null,
): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return "Loading this outlet's desk…";
    case 'empty':
      return desk ? emptyCopy(desk) : 'Nothing waiting on this desk.';
    case 'validation':
      return 'Select an outlet before opening this desk.';
    case 'denied':
      return 'This desk is not on your floor roles. Ask the owner.';
    case 'conflict':
      return 'These figures changed on another till. Refresh, then look again.';
    case 'failure':
      return 'Could not load this desk. Check the connection and try again.';
    case 'success':
      return desk ? successCopy(desk) : null;
    default:
      return null;
  }
}

export function statusIcon(status: PageStatus) {
  if (status === 'success') {
    return CheckCircle2;
  }
  if (status === 'failure' || status === 'conflict') {
    return WifiOff;
  }
  return AlertCircle;
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'CONFLICT') {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  if (code === 'NO_ACTIVE_BRANCH') {
    return 'Select an outlet before opening this desk.';
  }
  if (code === 'VALIDATION_ERROR') {
    return 'This desk cannot use that outlet filter.';
  }
  if (code === 'STALE_STATE') {
    return 'These figures changed on another till. Refresh, then look again.';
  }
  return null;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatHeldAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function formatQty(value: number | string): string {
  return String(value);
}

export function formatAsOf(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function formatDay(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+05:30`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function ownerWidgetList(owner: OwnerDesk): DashboardWidget<unknown>[] {
  return [
    owner.sales,
    owner.lowStock,
    owner.expiry,
    owner.approvals,
    owner.receivables,
    owner.payables,
    owner.topProducts,
    owner.transfers,
    owner.compliance,
    owner.openPurchaseOrders,
  ].filter((widget): widget is DashboardWidget<unknown> => widget != null);
}

function isEmptyOwnerDesk(owner: OwnerDesk): boolean {
  const widgets = ownerWidgetList(owner);
  if (widgets.some((widget) => widget.status === 'FAILED')) {
    return false;
  }
  if (widgets.length > 0) {
    return widgets.every(isQuietWidget);
  }
  return (
    owner.todayBillCount === 0 &&
    owner.lowStockCount === 0 &&
    owner.receivablesTotalPaise === 0 &&
    owner.payablesTotalPaise === 0 &&
    owner.expenseTotalPaise === 0
  );
}

function isQuietWidget(widget: DashboardWidget<unknown>): boolean {
  const data = widget.data as Record<string, unknown> | null | undefined;
  if (data == null) {
    return true;
  }
  if (typeof data.todayBillCount === 'number') {
    return data.todayBillCount === 0;
  }
  if (typeof data.count === 'number') {
    return data.count === 0;
  }
  if (typeof data.licenseDueCount === 'number') {
    return data.licenseDueCount === 0;
  }
  if (typeof data.totalPaise === 'number') {
    return data.totalPaise === 0;
  }
  return true;
}
