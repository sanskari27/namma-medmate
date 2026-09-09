export const AUTH_STORAGE_KEY = 'nmm.dispensary.session';
export const SESSION_END_REASON_KEY = 'nmm.dispensary.sessionEndReason';

export type SessionEndReason = 'expired' | 'revoked' | 'abandoned' | 'elsewhere';

export function sessionEndCopy(reason: string | null): string | null {
  switch (reason) {
    case 'abandoned':
      return 'This counter stayed locked too long. Sign in again to reopen the till.';
    case 'revoked':
      return 'This counter session ended. Sign in again with PIN or email.';
    case 'elsewhere':
      return 'Signed in on another device. This till needs a fresh sign-in.';
    case 'expired':
      return 'Your session ended. Sign in again to continue on this till.';
    default:
      return null;
  }
}

export function takeSessionEndReason(): string | null {
  const reason = sessionStorage.getItem(SESSION_END_REASON_KEY);
  if (reason) {
    sessionStorage.removeItem(SESSION_END_REASON_KEY);
  }
  return reason;
}
