import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type InventoryHeaderProps = {
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
};

export function InventoryHeader({ addButtonRef, denied = false, onAdd }: InventoryHeaderProps) {
  return (
    <Reveal>
      <header
        className={`border-b border-line pb-3 ${
          denied ? '' : 'flex flex-wrap items-end justify-between gap-3'
        }`}
      >
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">Floor catalogue</p>
          <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
          <p className={`mt-1 text-sm text-muted ${denied ? '' : 'max-w-xl'}`}>
            {denied
              ? 'Product SKUs for this pharmacy floor.'
              : 'Tenant product master for this pharmacy. Search by name, SKU, or barcode — discontinued packs stay on the list.'}
          </p>
        </div>
        {denied ? null : (
          <Button ref={addButtonRef} type="button" onClick={onAdd}>
            Add product
          </Button>
        )}
      </header>
    </Reveal>
  );
}
