import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import type {
  PrescriptionArchiveReason,
  PrescriptionReferenceStatus,
} from '@/services/prescriptionReferences';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type RxFilter = 'ACTIVE' | 'ARCHIVED';

export function canViewRxFile(
  role: string | undefined,
  roles: { code: string | null }[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return Boolean(roles?.some((item) => item.code === 'pharmacist'));
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading the Rx file for this pharmacy…';
    case 'empty':
      return 'No sale-time Rx references on this list yet. Attach an Rx on a collected bill, then it shows here.';
    case 'validation':
      return 'Open an Rx on the left before archiving. Only filled or six-month-old references can leave Active.';
    case 'denied':
      return 'Only a pharmacist or owner can open the Rx file. Ask them at this counter.';
    case 'conflict':
      return 'This Rx file changed on another till. Reload it, then try again.';
    case 'failure':
      return 'Could not load the Rx file. Check the connection and try again.';
    case 'success':
      return 'Rx archived. History and source bills stay on file.';
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
  if (error.status === 409 || error.code === 'STALE_STATE') {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
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

export function statusLabel(status: PrescriptionReferenceStatus): string {
  return status === 'ARCHIVED' ? 'Archived' : 'Active';
}

export function reasonLabel(reason: PrescriptionArchiveReason | null): string {
  if (reason === 'EXPIRED') {
    return 'Expired — six months from the sale';
  }
  if (reason === 'FULFILLED') {
    return 'Filled — nothing left on this Rx';
  }
  return 'Still on the floor';
}

export function formatIst(value: string | null): string {
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

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function filterLabel(filter: RxFilter): string {
  return filter === 'ARCHIVED' ? 'Archived' : 'Active';
}
