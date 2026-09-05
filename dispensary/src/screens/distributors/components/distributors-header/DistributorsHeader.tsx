import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type DistributorsHeaderProps = {
  addButtonId: string;
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
};

export function DistributorsHeader({
  addButtonId,
  addButtonRef,
  denied = false,
  onAdd,
}: DistributorsHeaderProps) {
  return (
    <Reveal>
      <header
        className={`border-b border-line pb-3 ${
          denied ? '' : 'flex flex-wrap items-end justify-between gap-3'
        }`}
      >
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">Supplier book</p>
          <h1 className="text-2xl font-semibold text-ink">Distributors</h1>
          <p className={`mt-1 text-sm text-muted ${denied ? '' : 'max-w-xl'}`}>
            {denied
              ? 'Stockists this pharmacy buys from.'
              : 'Tenant-wide suppliers. Each outlet still places its own purchase orders against this card.'}
          </p>
        </div>
        {denied ? null : (
          <Button ref={addButtonRef} id={addButtonId} type="button" onClick={onAdd}>
            Add supplier
          </Button>
        )}
      </header>
    </Reveal>
  );
}
