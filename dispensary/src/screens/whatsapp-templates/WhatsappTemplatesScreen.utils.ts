import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export function isOwner(role: string | undefined): boolean {
  return role === 'pharmacy_owner';
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading WhatsApp slots for this pharmacy…';
    case 'empty':
      return 'No approved WhatsApp templates for this pharmacy yet.';
    case 'validation':
      return "Fill this pharmacy's name before saving slots.";
    case 'denied':
      return 'Only the owner can set WhatsApp slots at this counter. Ask the owner if a message needs a shop name.';
    case 'conflict':
      return 'These slots were updated on another till. Reload, then save.';
    case 'failure':
      return 'Could not load WhatsApp slots. Check the connection and try again.';
    case 'success':
      return 'WhatsApp slots saved for this pharmacy.';
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
  if (
    error.status === 409 ||
    error.code === 'STALE_STATE' ||
    error.code === 'NAMESPACE_COLLISION' ||
    error.code === 'CONFLICT'
  ) {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  if (code === 'UNKNOWN_VARIABLE') {
    return 'That slot is not on the approved message. Save only this pharmacy\'s name.';
  }
  if (code === 'UNAPPROVED_TEMPLATE') {
    return 'This message is not approved yet. Pick an approved template.';
  }
  if (code === 'STRUCTURAL_REWRITE') {
    return 'The approved wording cannot be rewritten from this counter.';
  }
  if (code === 'STALE_STATE' || code === 'NAMESPACE_COLLISION') {
    return 'These slots were updated on another till. Reload, then save.';
  }
  return null;
}

export function templateLabel(uniqueName: string): string {
  switch (uniqueName) {
    case 'refill_due':
      return 'Refill due';
    case 'refill_due_warm':
      return 'Refill due (warm)';
    case 'credit_due':
      return 'Khata due';
    case 'campaign':
      return 'Campaign note';
    case 'birthday':
      return 'Birthday';
    default:
      return uniqueName.replace(/_/g, ' ');
  }
}

export function slotLabel(slot: string): string {
  if (slot === 'pharmacy_name') {
    return "This pharmacy's name";
  }
  return slot.replace(/_/g, ' ');
}

export function slotsFilled(values: Record<string, string>, tenantSlots: string[]): boolean {
  return tenantSlots.every((slot) => (values[slot] ?? '').trim().length > 0);
}
