import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type OffersHeaderProps = {
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
};

export function OffersHeader({ addButtonRef, denied = false, onAdd }: OffersHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Schemes</h1>
          <p className="mt-1 text-sm text-muted">
            BOGO, seasonal, and bundle schemes for this pharmacy counter.
          </p>
        </div>
        {denied ? null : (
          <Button ref={addButtonRef} type="button" onClick={onAdd}>
            New scheme
          </Button>
        )}
      </header>
    </Reveal>
  );
}
