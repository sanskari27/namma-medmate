import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FilterState = {
  from: string;
  to: string;
  schedule: string;
  productId: string;
  patientId: string;
  pharmacistUserId: string;
};

export const emptyFilters = (): FilterState => ({
  from: '',
  to: '',
  schedule: '',
  productId: '',
  patientId: '',
  pharmacistUserId: '',
});

export function canOpenSaleBook(
  role: string | undefined,
  roles: { code: string | null }[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return Boolean(roles?.some((item) => item.code === 'pharmacist'));
}

export function filtersValid(filters: FilterState): boolean {
  if (!filters.from || !filters.to) {
    return true;
  }
  return filters.from <= filters.to;
}

export function toQuery(filters: FilterState): {
  schedule?: string;
  productId?: string;
  patientId?: string;
  pharmacistUserId?: string;
  from?: string;
  to?: string;
} {
  const query: {
    schedule?: string;
    productId?: string;
    patientId?: string;
    pharmacistUserId?: string;
    from?: string;
    to?: string;
  } = {};
  if (filters.schedule) {
    query.schedule = filters.schedule;
  }
  if (filters.productId) {
    query.productId = filters.productId;
  }
  if (filters.patientId) {
    query.patientId = filters.patientId;
  }
  if (filters.pharmacistUserId) {
    query.pharmacistUserId = filters.pharmacistUserId;
  }
  if (filters.from) {
    query.from = `${filters.from}T00:00:00.000Z`;
  }
  if (filters.to) {
    query.to = `${filters.to}T23:59:59.000Z`;
  }
  return query;
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading the NDPS sale book for this outlet…';
    case 'empty':
      return 'No Schedule sales in this outlet yet. Completed H, H1, X, and NDPS bills land here.';
    case 'validation':
      return 'Choose a period that starts on or before the end date.';
    case 'denied':
      return 'Only a pharmacist or owner can open the NDPS sale book. Ask the owner to assign Pharmacist.';
    case 'conflict':
      return 'This sale book changed on another till. Reload, then take the sheet again.';
    case 'failure':
      return 'Could not load the NDPS sale book. Check the connection and try again.';
    case 'success':
      return 'NDPS sale book ready for this outlet.';
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

export function formatIst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function kindLabel(kind: string): string {
  return kind === 'RETURN' ? 'Return' : 'Sale';
}
