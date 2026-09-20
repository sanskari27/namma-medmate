import type { RefObject } from 'react';

type Props = {
  onLog: () => void;
  logRef: RefObject<HTMLButtonElement | null>;
};

export function PrivacyDeskHeader({ onLog, logRef }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h1 className="font-sans text-xl text-ink">Privacy desk</h1>
        <p className="text-sm text-muted">
          Log a shop request after you checked who they are. 30 days from accept. Contact platform
          ops for a grievance.
        </p>
      </div>
      <button
        ref={logRef}
        type="button"
        className="rounded-md bg-brand px-3 py-2 text-sm text-canvas"
        onClick={onLog}
      >
        Log a shop request
      </button>
    </header>
  );
}
