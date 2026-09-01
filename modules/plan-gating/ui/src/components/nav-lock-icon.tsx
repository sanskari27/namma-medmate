import { Lock } from 'lucide-react';
import { translate } from '@namma-medmate/i18n';
import { planGatingMessages } from '../i18n/en.ts';

export interface NavLockIconProps {
  locked: boolean;
}

export function NavLockIcon({ locked }: NavLockIconProps) {
  if (!locked) {
    return null;
  }
  return (
    <Lock
      role="img"
      aria-label={translate(planGatingMessages, 'planGating.nav.locked')}
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
}
