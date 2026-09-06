import type { AdminDueLicense, LicenseDocType, LicenseScope } from '@/services/licenses';
import { Ban, BadgeCheck, FileWarning, Unplug } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export function isMaster(role: string | undefined): boolean {
  return role === 'admin_super';
}

export function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: FileWarning, text: 'Scanning tenant licence expiries…' };
    case 'empty':
      return { icon: FileWarning, text: 'No tenant papers due in the next 30 days.' };
    case 'validation':
      return { icon: FileWarning, text: 'Enter a tenant name before isolating the due list.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can monitor licence expiry across tenants.' };
    case 'conflict':
      return { icon: Unplug, text: 'The due list moved during this scan. Rescan the platform.' };
    case 'failure':
      return {
        icon: Unplug,
        text: 'Could not load tenant licence expiries. Retry from this desk.',
      };
    case 'success':
      return {
        icon: BadgeCheck,
        text: 'Platform due list refreshed. Tenant expiries are current.',
      };
    default:
      return null;
  }
}

export function paperLabel(type: LicenseDocType): string {
  switch (type) {
    case 'DRUG_LICENSE':
      return 'Drug licence';
    case 'GST':
      return 'GST';
    case 'FSSAI':
      return 'FSSAI';
    case 'PHARMACIST_REGISTRATION':
      return 'Pharmacist registration';
    default:
      return type;
  }
}

export function scopeLabel(scope: LicenseScope): string {
  switch (scope) {
    case 'TENANT':
      return 'Tenant';
    case 'BRANCH':
      return 'Branch';
    case 'STAFF':
      return 'Staff';
    default:
      return scope;
  }
}

export function formatIstDate(value: string): string {
  if (!value) {
    return '—';
  }
  const date = value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function matchesTenant(row: AdminDueLicense, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return row.tenantName.toLowerCase().includes(needle);
}
