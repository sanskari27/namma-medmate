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

export type FormState = {
  name: string;
  tagIds: string[];
};

export const emptyForm = (): FormState => ({
  name: '',
  tagIds: [],
});

export { hasCampaignAccess } from '@/libs/campaignAccess';
export { hasFinanceAccess } from '@/libs/financeAccess';

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading tag broadcasts for this pharmacy…';
    case 'empty':
      return 'No tag broadcasts yet. Pick a saved tag and count this list.';
    case 'validation':
      return 'Name and at least one patient tag are needed before saving this broadcast.';
    case 'denied':
      return 'This till cannot prepare broadcasts. Ask the owner to grant Campaigns.';
    case 'conflict':
      return 'This broadcast was updated on another till. Reload, then count again.';
    case 'failure':
      return 'Could not load tag broadcasts. Check the connection and try again.';
    case 'success':
      return 'Broadcast saved.';
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

export function statusLabel(status: string): string {
  if (status === 'READY_FOR_DELIVERY') {
    return 'Ready to send';
  }
  return 'Draft';
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
  if (code === 'EMPTY_AUDIENCE') {
    return 'No patients match these tags. Add tags on Patients, then count this list.';
  }
  if (code === 'UNAPPROVED_TEMPLATE') {
    return 'Ask the owner to fill WhatsApp slots before this broadcast can go out.';
  }
  if (code === 'UNKNOWN_VARIABLE') {
    return 'This message slot is not a shop name on the approved template.';
  }
  if (code === 'PREVIEW_REQUIRED') {
    return 'Count this list before marking it ready to send.';
  }
  if (code === 'READY_ALREADY') {
    return 'This broadcast is already ready to send.';
  }
  return null;
}

export function formValid(form: FormState): boolean {
  return Boolean(form.name.trim()) && form.tagIds.length > 0;
}
