import type { WhatsAppStructure } from '@/services/whatsappTemplates';
import { Ban, BadgeCheck, Radio, Unplug } from 'lucide-react';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export function isMaster(role: string | undefined): boolean {
  return role === 'admin_super';
}

export function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Radio, text: 'Reading MASTER WABA provider and approved structures…' };
    case 'empty':
      return { icon: Radio, text: 'No approved WhatsApp structures on the platform WABA.' };
    case 'validation':
      return { icon: Radio, text: 'Enter a template unique name before isolating the catalogue.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can monitor the platform WhatsApp provider.' };
    case 'conflict':
      return { icon: Unplug, text: 'Provider status moved during this scan. Rescan the WABA.' };
    case 'failure':
      return {
        icon: Unplug,
        text: 'Could not load WABA templates. Retry from this HQ desk.',
      };
    case 'success':
      return {
        icon: BadgeCheck,
        text: 'Provider scan refreshed. Approved structures are current.',
      };
    default:
      return null;
  }
}

export function formatIstDateTime(value: string | null): string {
  if (!value) {
    return 'Never synced';
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

export function matchesStructure(row: WhatsAppStructure, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return row.uniqueName.toLowerCase().includes(needle) || row.status.toLowerCase().includes(needle);
}

export function namespaceRule(uniqueName: string): string {
  return `{tenantId}_${uniqueName}`;
}
