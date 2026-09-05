import { isApiError } from '@/services/axios';
import type { PageStatus } from '../../InventoryScreen.utils';

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatIst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function originLabel(origin: string): string {
  return origin === 'QC' ? 'From QC reject' : 'Sent back from floor';
}

export function mapReturnStatus(error: unknown): PageStatus {
  if (!isApiError(error)) {
    return 'failure';
  }
  if (error.status === 403) {
    return 'denied';
  }
  if (error.status === 409) {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}
