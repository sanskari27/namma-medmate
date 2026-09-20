export type HqPrivacyStatus =
  | 'loading'
  | 'empty'
  | 'denied'
  | 'validation'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export function hqPrivacyCopy(status: HqPrivacyStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Loading HQ principal requests';
    case 'empty':
      return 'No principal requests on the platform file.';
    case 'denied':
      return 'Only MASTER desks can fulfill platform privacy requests.';
    case 'validation':
      return 'Record how HQ verified the requester before the 30-day clock starts.';
    case 'conflict':
      return 'This platform request is already accepted or closed.';
    case 'failure':
      return 'Could not load principal requests. Retry.';
    case 'success':
      return 'Platform privacy request updated.';
    default:
      return null;
  }
}
