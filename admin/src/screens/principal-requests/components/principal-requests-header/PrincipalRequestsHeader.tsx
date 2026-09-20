import type { RefObject } from 'react';

type Props = { onLog: () => void; logRef: RefObject<HTMLButtonElement | null> };

export function PrincipalRequestsHeader({ onLog, logRef }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h1 className="font-serif text-2xl text-ink">Principal requests</h1>
        <p className="text-sm text-muted">
          Record a verified HQ request for a platform account or pharmacy KYC file. Grievance:
          contact platform ops.
        </p>
      </div>
      <button
        ref={logRef}
        type="button"
        className="rounded-sm bg-brand px-3 py-2 text-sm text-canvas"
        onClick={onLog}
      >
        Record HQ request
      </button>
    </header>
  );
}
