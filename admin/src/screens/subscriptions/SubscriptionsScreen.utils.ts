import { Ban, BadgeCheck, ScrollText, Unplug } from 'lucide-react';

export type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
export type DialogStatus = 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'loading' | null;

export function isMaster(role: string | undefined): boolean {
  return role === 'admin_super';
}

export function planLabel(code: string): string {
  return code.charAt(0) + code.slice(1).toLowerCase();
}

export function formatIstDate(value: string | null): string {
  if (!value) {
    return 'Open-ended';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatIstStamp(value: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function occupancy(used: number, cap: number | null): { label: string; ratio: number } {
  if (cap == null) {
    return { label: `${used} / open`, ratio: 0 };
  }
  return { label: `${used}/${cap}`, ratio: cap === 0 ? 0 : Math.min(1, used / cap) };
}

export function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ScrollText, text: 'Loading tenant subscriptions…' };
    case 'empty':
      return { icon: ScrollText, text: 'No tenant subscriptions on the platform yet.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can override tenant plans, status, or expiry.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load tenant subscriptions. Try again.' };
    case 'success':
      return {
        icon: BadgeCheck,
        text: 'Override filed. Plan, status, and expiry updated for the tenant.',
      };
    default:
      return null;
  }
}

export function dialogCopy(status: DialogStatus): string | null {
  switch (status) {
    case 'empty':
      return 'No override history for this tenant yet.';
    case 'validation':
      return 'Plan, status, and a reason are required before filing an override.';
    case 'denied':
      return 'Your desk cannot file plan overrides.';
    case 'conflict':
      return 'Usage exceeds the target plan. Tenant must reduce outlets or users first.';
    case 'failure':
      return 'Could not file the override. Try again.';
    default:
      return null;
  }
}

export type PayStatus =
  | 'loading'
  | 'empty'
  | 'denied'
  | 'failure'
  | 'validation'
  | 'conflict'
  | 'success'
  | null;

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Open checkout';
    case 'SUCCESS':
      return 'Collected';
    case 'FAILED':
      return 'Failed';
    case 'ABANDONED':
      return 'Abandoned';
    default:
      return status;
  }
}

export function paymentCopy(status: PayStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ScrollText, text: 'Loading pharmacy-to-platform charges…' };
    case 'empty':
      return { icon: ScrollText, text: 'No checkout exceptions on this ledger.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can inspect pharmacy-to-platform charges.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load pharmacy-to-platform charges. Try again.' };
    case 'validation':
      return { icon: Ban, text: 'That charge record is not usable. Refresh the ledger.' };
    case 'conflict':
      return {
        icon: Unplug,
        text: 'Checkout ledger changed. Refresh pharmacy-to-platform charges.',
      };
    default:
      return null;
  }
}

export function formatPaise(amountPaise: number): string {
  return `₹${(amountPaise / 100).toLocaleString('en-IN')}`;
}
