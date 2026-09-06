import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import type { WhatsAppMessageKind, WhatsAppMessageStatus } from '@/services/whatsappMessages';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type KindFilter = 'ALL' | WhatsAppMessageKind;

export { hasCampaignAccess } from '@/libs/campaignAccess';

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading WhatsApp sends for this pharmacy…';
    case 'empty':
      return 'No WhatsApp sends yet. Freeze a tag list, or wait for refill and khata reminders.';
    case 'validation':
      return 'Pick a failed send before trying again from this counter.';
    case 'denied':
      return 'This till cannot send WhatsApp. Ask the owner to grant Campaigns.';
    case 'conflict':
      return 'This send was updated on another till. Reload, then retry.';
    case 'failure':
      return 'Could not load WhatsApp sends. Check the connection and try again.';
    case 'success':
      return 'WhatsApp send updated.';
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

export function kindLabel(kind: WhatsAppMessageKind): string {
  if (kind === 'REFILL_DUE') {
    return 'Refill due';
  }
  if (kind === 'CREDIT_DUE') {
    return 'Khata due';
  }
  return 'Tag broadcast';
}

export function outcomeLabel(status: WhatsAppMessageStatus): string {
  if (status === 'QUEUED') {
    return 'Queued';
  }
  if (status === 'SENT') {
    return 'Sent';
  }
  return 'Failed';
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'CONFLICT') {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422 || error.code === 'VALIDATION_ERROR') {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  if (code === 'INVALID_PHONE') {
    return 'This patient phone cannot be used for WhatsApp. Fix the number on Patients, then retry.';
  }
  if (code === 'UNAPPROVED_TEMPLATE') {
    return 'Ask the owner to fill WhatsApp slots before this send can go out.';
  }
  if (code === 'PROVIDER_UNAVAILABLE') {
    return 'WhatsApp is down. Keep this row and send again when the line is back.';
  }
  if (code === 'NOT_READY') {
    return 'Freeze this list before sending the shop update.';
  }
  return null;
}
