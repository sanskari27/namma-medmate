import { Button } from '@atoms';
import type { ImpersonationState } from '@/store';

type Props = {
  session: ImpersonationState;
  busy?: boolean;
  onExit: () => void;
};

export function HqSupportBanner({ session, busy = false, onExit }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-warn/40 bg-elevated px-6 py-2.5"
    >
      <p className="text-sm text-ink">
        Support session: viewing <span className="font-medium">{session.effectiveDisplayName}</span>{' '}
        (<span className="font-mono text-xs">{session.effectiveRole}</span>) in tenant{' '}
        <span className="font-mono text-xs">{session.tenantName}</span>. Original operator{' '}
        <span className="font-medium">{session.originalDisplayName}</span>.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={onExit}
        aria-label="Exit support session"
      >
        {busy ? 'Exiting…' : 'Exit support session'}
      </Button>
    </div>
  );
}

export default HqSupportBanner;
