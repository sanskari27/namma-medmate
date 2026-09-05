import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type PrescriptionsHeaderProps = {
  archiveRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onScan: () => void;
};

export function PrescriptionsHeader({
  archiveRef,
  denied = false,
  onScan,
}: PrescriptionsHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Rx file</h1>
          <p className="mt-1 text-sm text-muted">
            Sale-time prescription references at this pharmacy. Archived stay readable. They cannot
            go on a new bill.
          </p>
        </div>
        {denied ? null : (
          <Button ref={archiveRef} type="button" onClick={onScan}>
            Archive expired
          </Button>
        )}
      </header>
    </Reveal>
  );
}
