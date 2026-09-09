import type {
  PrescriptionArchiveReason,
  PrescriptionReference,
  PrescriptionReferenceStatus,
} from '@/services/prescriptionReferences';
import { RX_CONTENT } from './PrescriptionsScreen.content';

export type RxPageStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'denied'
  | 'no_branch';

export type RxFilter = 'active' | 'fulfilled' | 'expired' | 'all';

export type RxTone = 'green' | 'gold' | 'rose' | 'gray';

const DAY_MS = 86_400_000;
const EXPIRING_SOON_DAYS = 30;

export function canViewRxFile(
  role: string | undefined,
  roles: { code: string | null }[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') return true;
  return Boolean(roles?.some((item) => item.code === 'pharmacist'));
}

export function formatIst(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function relativeAge(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);
  const days = Math.floor(diff / DAY_MS);
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours <= 0) return 'just now';
    return `${hours}h ago`;
  }
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

export function daysUntil(iso: string, now = Date.now()): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.ceil((then - now) / DAY_MS);
}

export function isExpiringSoon(row: PrescriptionReference, now = Date.now()): boolean {
  if (row.status !== 'ACTIVE') return false;
  const days = daysUntil(row.expiresAt, now);
  return days >= 0 && days <= EXPIRING_SOON_DAYS;
}

export function isPastValidity(row: PrescriptionReference, now = Date.now()): boolean {
  if (row.status !== 'ACTIVE') return false;
  return daysUntil(row.expiresAt, now) < 0;
}

export function statusLabel(status: PrescriptionReferenceStatus): string {
  return status === 'ARCHIVED' ? 'Archived' : 'Active';
}

export function reasonLabel(reason: PrescriptionArchiveReason | null): string {
  if (reason === 'EXPIRED') return 'Expired — six months from the sale';
  if (reason === 'FULFILLED') return 'Filled — nothing left on this Rx';
  return 'Still on the floor';
}

export function cardStatusLabel(row: PrescriptionReference): string {
  if (row.status === 'ACTIVE') return RX_CONTENT.card.active;
  if (row.archiveReason === 'FULFILLED') return RX_CONTENT.card.fulfilled;
  if (row.archiveReason === 'EXPIRED') return RX_CONTENT.card.expired;
  return 'Archived';
}

export function cardTone(row: PrescriptionReference): RxTone {
  if (row.status === 'ACTIVE') {
    if (isPastValidity(row)) return 'rose';
    if (isExpiringSoon(row)) return 'gold';
    return 'green';
  }
  if (row.archiveReason === 'EXPIRED') return 'rose';
  if (row.archiveReason === 'FULFILLED') return 'gray';
  return 'gray';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function doctorLine(row: PrescriptionReference): string {
  if (!row.doctorName) return RX_CONTENT.card.noDoctor;
  if (row.doctorRegistration) return `${row.doctorName} · ${row.doctorRegistration}`;
  return row.doctorName;
}

export function matchesFilter(row: PrescriptionReference, filter: RxFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return row.status === 'ACTIVE';
  if (filter === 'fulfilled') {
    return row.status === 'ARCHIVED' && row.archiveReason === 'FULFILLED';
  }
  return row.status === 'ARCHIVED' && row.archiveReason === 'EXPIRED';
}

export function matchesQuery(row: PrescriptionReference, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.prescriptionReference,
    row.customerName,
    row.customerPhone,
    row.doctorName,
    row.doctorRegistration,
    row.branchName,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function filteredRows(
  items: PrescriptionReference[],
  filter: RxFilter,
  query: string,
): PrescriptionReference[] {
  return items.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query));
}

export function filterCounts(items: PrescriptionReference[]) {
  return {
    active: items.filter((row) => matchesFilter(row, 'active')).length,
    fulfilled: items.filter((row) => matchesFilter(row, 'fulfilled')).length,
    expired: items.filter((row) => matchesFilter(row, 'expired')).length,
    all: items.length,
  };
}

export function billedPaiseOf(row: PrescriptionReference): number {
  if (typeof row.billedPaise === 'number' && row.billedPaise > 0) return row.billedPaise;
  return (row.invoices ?? []).reduce((sum, inv) => sum + (inv.totalPaise ?? 0), 0);
}

export function summaryStats(items: PrescriptionReference[], now = Date.now()) {
  const active = items.filter((row) => row.status === 'ACTIVE');
  return {
    active: active.length,
    expiring: active.filter((row) => isExpiringSoon(row, now)).length,
    due: active.filter((row) => isPastValidity(row, now)).length,
    fulfilled: items.filter((row) => matchesFilter(row, 'fulfilled')).length,
    expired: items.filter((row) => matchesFilter(row, 'expired')).length,
    billedPaise: items.reduce((sum, row) => sum + billedPaiseOf(row), 0),
  };
}

export type DoctorRank = { name: string; count: number };

export function topDoctors(items: PrescriptionReference[], limit = 5): DoctorRank[] {
  const map = new Map<string, number>();
  for (const row of items) {
    const key = row.doctorName?.trim() || RX_CONTENT.insights.noDoctor;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function statusMix(items: PrescriptionReference[]) {
  const active = items.filter((row) => row.status === 'ACTIVE').length;
  const fulfilled = items.filter((row) => matchesFilter(row, 'fulfilled')).length;
  const expired = items.filter((row) => matchesFilter(row, 'expired')).length;
  const total = Math.max(1, active + fulfilled + expired);
  return {
    active,
    fulfilled,
    expired,
    billedPaise: items.reduce((sum, row) => sum + billedPaiseOf(row), 0),
    activePct: Math.round((active / total) * 100),
    fulfilledPct: Math.round((fulfilled / total) * 100),
    expiredPct: Math.round((expired / total) * 100),
  };
}

export function expiryBanner(row: PrescriptionReference, now = Date.now()): string | null {
  if (row.status !== 'ACTIVE') {
    if (row.archiveReason === 'FULFILLED') return 'Filled — nothing left on this Rx';
    if (row.archiveReason === 'EXPIRED') return 'Archived after six-month validity';
    return null;
  }
  const days = daysUntil(row.expiresAt, now);
  if (days < 0) return `Past validity · ${Math.abs(days)}d overdue`;
  if (days <= EXPIRING_SOON_DAYS) return `Valid ${days}d more · expiring soon`;
  return `Valid until ${formatIst(row.expiresAt)}`;
}

export function apiHint(code: string | null): string | null {
  if (code === 'PREMATURE_ARCHIVE') {
    return 'This Rx is still valid and still has quantity left. Wait until it is filled or six months have passed.';
  }
  if (code === 'ARCHIVED_REFERENCE') {
    return 'This Rx is archived — history only, not a new sale.';
  }
  if (code === 'REACTIVATION_FORBIDDEN') {
    return 'Archived Rx references stay archived.';
  }
  if (code === 'STALE_STATE') {
    return 'This Rx file changed on another till. Reload it, then try again.';
  }
  return null;
}
