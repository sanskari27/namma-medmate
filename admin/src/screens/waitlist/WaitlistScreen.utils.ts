import type { WaitlistSignup } from '@/services/waitlist';
import { Ban, ClipboardList, Unplug, type LucideIcon } from 'lucide-react';

export type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | null;

const GENDER: Record<string, string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  'prefer-not-to-say': 'Prefer not to say',
};

export function formatJoined(value: string): string {
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

export function genderLabel(value: string): string {
  return GENDER[value] ?? value;
}

export function matchesQuery(row: WaitlistSignup, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    row.name.toLowerCase().includes(needle) ||
    row.phone.includes(needle) ||
    row.pincode.includes(needle)
  );
}

export function statusCopy(status: PageStatus): { icon: LucideIcon; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ClipboardList, text: 'Loading waitlist sign-ups…' };
    case 'empty':
      return { icon: ClipboardList, text: 'No waitlist sign-ups yet.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can read the waitlist.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load the waitlist. Try again.' };
    default:
      return null;
  }
}
