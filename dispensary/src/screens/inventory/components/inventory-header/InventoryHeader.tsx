import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type InventoryViewMode = 'floor' | 'catalogue' | 'transfers' | 'guidance';

export type InventoryHeaderProps = {
  view: InventoryViewMode;
  onViewChange: (view: InventoryViewMode) => void;
  addButtonRef?: Ref<HTMLButtonElement>;
  receiveButtonRef?: Ref<HTMLButtonElement>;
  transferButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
  onReceive: () => void;
  onTransfer: () => void;
};

export function InventoryHeader({
  view,
  onViewChange,
  addButtonRef,
  receiveButtonRef,
  transferButtonRef,
  denied = false,
  onAdd,
  onReceive,
  onTransfer,
}: InventoryHeaderProps) {
  const eyebrow =
    view === 'floor'
      ? 'Floor stock'
      : view === 'catalogue'
        ? 'Floor catalogue'
        : view === 'transfers'
          ? 'Outlet transfers'
          : 'FEFO & reorder';
  const blurb = denied
    ? 'Stock and SKUs for this pharmacy floor.'
    : view === 'floor'
      ? 'Batch, expiry, and quantity on the active outlet. Receive stock to open a batch on this till.'
      : view === 'catalogue'
        ? 'Tenant product master for this pharmacy. Search by name, SKU, or barcode — discontinued packs stay on the list.'
        : view === 'transfers'
          ? 'Push or pull stock between outlets. Receiving till confirms before stock lands on the floor.'
          : 'Near-expiry warnings, low-stock transfer hints, reorder CSV, and purchase-price valuation for this outlet.';

  return (
    <Reveal>
      <header className="grid gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">{eyebrow}</p>
            <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
            <p className={`mt-1 text-sm text-muted ${denied ? '' : 'max-w-xl'}`}>{blurb}</p>
          </div>
          {denied ? null : view === 'floor' ? (
            <Button ref={receiveButtonRef} type="button" onClick={onReceive}>
              Receive stock
            </Button>
          ) : view === 'catalogue' ? (
            <Button ref={addButtonRef} type="button" onClick={onAdd}>
              Add product
            </Button>
          ) : view === 'transfers' ? (
            <Button ref={transferButtonRef} type="button" onClick={onTransfer}>
              Start transfer
            </Button>
          ) : null}
        </div>
        {denied ? null : (
          <div
            className="inline-flex w-fit border border-line"
            role="tablist"
            aria-label="Inventory view"
          >
            {(
              [
                ['floor', 'Floor stock'],
                ['catalogue', 'Catalogue'],
                ['transfers', 'Transfers'],
                ['guidance', 'Guidance'],
              ] as const
            ).map(([mode, label], index) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                className={`${index > 0 ? 'border-l border-line ' : ''}px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  view === mode ? 'bg-brand-soft font-medium text-ink' : 'bg-surface text-muted'
                }`}
                onClick={() => onViewChange(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>
    </Reveal>
  );
}
