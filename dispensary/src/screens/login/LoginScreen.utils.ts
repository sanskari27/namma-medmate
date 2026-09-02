import { AlertCircle, Lock, WifiOff } from 'lucide-react';

export const PHARMACY_ROLES = new Set(['pharmacy_owner', 'pharmacy_staff']);

export type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'locked' | 'conflict' | 'failure' | null;

export function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Enter the email and password for this counter.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Email or password does not match this counter login. Check the email on this branch login.',
      };
    case 'locked':
      return {
        icon: Lock,
        text: 'This staff account cannot enter the dispensary. Ask the owner.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This counter session is out of date. Sign in again.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Try again from this counter.',
      };
    default:
      return null;
  }
}

export function tillRole(role: string): string {
  return role === 'pharmacy_owner' ? 'Owner' : 'Counter staff';
}
