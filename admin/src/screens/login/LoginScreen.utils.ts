import { Ban, ShieldAlert, Unplug } from 'lucide-react';

export type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'locked' | 'conflict' | 'failure' | null;

export function statusCopy(status: FormStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: ShieldAlert, text: 'Enter HQ email and password.' };
    case 'denied':
      return { icon: Ban, text: 'HQ credentials were not recognised.' };
    case 'locked':
      return { icon: ShieldAlert, text: 'This operator account cannot enter HQ.' };
    case 'conflict':
      return { icon: ShieldAlert, text: 'This HQ session is stale. Sign in again.' };
    case 'failure':
      return { icon: Unplug, text: 'The platform API did not respond. Retry from this console.' };
    default:
      return null;
  }
}

export function isHqOperator(role: string): boolean {
  return role === 'admin_super' || role === 'admin_verification';
}
