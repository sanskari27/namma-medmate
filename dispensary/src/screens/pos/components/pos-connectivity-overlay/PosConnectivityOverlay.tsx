import { useEffect, useRef } from 'react';

interface PosConnectivityOverlayProps {
  open: boolean;
}

export function PosConnectivityOverlay({ open }: PosConnectivityOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }
  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pos-offline-title"
      aria-describedby="pos-offline-copy"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="max-w-md space-y-3 border border-line bg-surface p-6 text-ink">
        <h2 id="pos-offline-title" className="text-lg font-semibold">
          Till is offline
        </h2>
        <p id="pos-offline-copy" className="text-sm text-muted">
          Keep this bill. Collect when the counter is back on the line.
        </p>
      </div>
    </div>
  );
}
