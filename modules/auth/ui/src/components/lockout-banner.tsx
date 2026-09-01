import { translate } from '@namma-medmate/i18n';
import { StatusBanner } from '@namma-medmate/shared-ui';
import { authMessages } from '../i18n/en.ts';

export interface LockoutBannerProps {
  lockedUntil: string;
}

export function LockoutBanner({ lockedUntil }: LockoutBannerProps) {
  return (
    <StatusBanner tone="error">
      {translate(authMessages, 'auth.lock.message').replace('{{locked_until}}', lockedUntil)}
    </StatusBanner>
  );
}
