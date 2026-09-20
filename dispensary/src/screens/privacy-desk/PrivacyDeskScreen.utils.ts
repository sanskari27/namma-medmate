export type PrivacyStatus =
  | 'loading'
  | 'empty'
  | 'denied'
  | 'validation'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export function privacyCopy(status: PrivacyStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Loading privacy requests';
    case 'empty':
      return 'No privacy requests on this shop yet. Log one after you checked who they are.';
    case 'denied':
      return 'Only the pharmacy owner can run the privacy desk.';
    case 'validation':
      return 'Say how you checked who they are before the 30-day clock starts.';
    case 'conflict':
      return 'This request was already accepted or closed. Refresh the desk.';
    case 'failure':
      return 'Could not load privacy requests. Try again.';
    case 'success':
      return 'Privacy request updated on this shop.';
    default:
      return null;
  }
}

export function formatDeadline(value: string | null): string {
  if (!value) return '—';
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
