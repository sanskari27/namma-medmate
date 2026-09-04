import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type InventoryViewMode = 'floor' | 'catalogue';

export type InventoryHeaderProps = {
  view: InventoryViewMode;
  onViewChange: (view: InventoryViewMode) => void;
  addButtonRef?: Ref<HTMLButtonElement>;
  receiveButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
  onReceive: () => void;
};

export function InventoryHeader({
  view,
  onViewChange,
  addButtonRef,
  receiveButtonRef,
  denied = false,
  onAdd,
  onReceive,
}: InventoryHeaderProps) {
  const floor = view === 'floor';
  return (
    <Reveal>
      <header className="grid gap-3 border-b border-line pb-3">
        <div className={`flex flex-wrap items-end justify-between gap-3 ${denied ? '' : ''}`}>
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">
              {floor ? 'Floor stock' : 'Floor catalogue'}
            </p>
            <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
            <p className={`mt-1 text-sm text-muted ${denied ? '' : 'max-w-xl'}`}>
              {denied
                ? 'Stock and SKUs for this pharmacy floor.'
                : floor
                  ? 'Batch, expiry, and quantity on the active outlet. Receive stock to open a batch on this till.'
                  : 'Tenant product master for this pharmacy. Search by name, SKU, or barcode — discontinued packs stay on the list.'}
            </p>
          </div>
          {denied ? null : floor ? (
            <Button ref={receiveButtonRef} type="button" onClick={onReceive}>
              Receive stock
            </Button>
          ) : (
            <Button ref={addButtonRef} type="button" onClick={onAdd}>
              Add product
            </Button>
          )}
        </div>
        {denied ? null : (
          <div
            className="inline-flex w-fit border border-line"
            role="tablist"
            aria-label="Inventory view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={floor}
              className={`px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                floor ? 'bg-brand-soft font-medium text-ink' : 'bg-surface text-muted'
              }`}
              onClick={() => onViewChange('floor')}
            >
              Floor stock
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!floor}
              className={`border-l border-line px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                !floor ? 'bg-brand-soft font-medium text-ink' : 'bg-surface text-muted'
              }`}
              onClick={() => onViewChange('catalogue')}
            >
              Catalogue
            </button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
