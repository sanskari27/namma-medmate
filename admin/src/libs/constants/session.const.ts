export const AUTH_STORAGE_KEY = 'nmm.admin.session';
export const SESSION_END_REASON_KEY = 'nmm.admin.sessionEndReason';

export function sessionEndCopy(reason: string | null): string | null {
  switch (reason) {
    case 'abandoned':
      return 'This HQ session stayed locked too long. Sign in again.';
    case 'revoked':
      return 'This HQ session ended. Sign in again with PIN or email.';
    case 'elsewhere':
      return 'Signed in on another device. This console needs a fresh sign-in.';
    case 'expired':
      return 'Your session ended. Sign in again to continue at HQ.';
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
