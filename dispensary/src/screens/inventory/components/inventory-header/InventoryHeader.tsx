import { Reveal } from '@atoms';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';

export type InventoryViewMode =
  | 'floor'
  | 'catalogue'
  | 'transfers'
  | 'adjustments'
  | 'guidance'
  | 'stocktake'
  | 'controlled'
  | 'qc'
  | 'returns';

const VIEW_COPY: Record<InventoryViewMode, { tab: string }> = {
  floor: { tab: INVENTORY_CONTENT.tabs.floor },
  catalogue: { tab: INVENTORY_CONTENT.tabs.catalogue },
  transfers: { tab: INVENTORY_CONTENT.tabs.transfers },
  adjustments: { tab: INVENTORY_CONTENT.tabs.adjustments },
  guidance: { tab: INVENTORY_CONTENT.tabs.guidance },
  stocktake: { tab: INVENTORY_CONTENT.tabs.stocktake },
  controlled: { tab: INVENTORY_CONTENT.tabs.controlled },
  qc: { tab: INVENTORY_CONTENT.tabs.qc },
  returns: { tab: INVENTORY_CONTENT.tabs.returns },
};

export type InventoryHeaderProps = {
  view: InventoryViewMode;
  onViewChange: (view: InventoryViewMode) => void;
  denied?: boolean;
};

export function InventoryHeader({ view, onViewChange, denied = false }: InventoryHeaderProps) {
  return (
    <Reveal>
      <header className="grid gap-3">
        {denied ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {INVENTORY_CONTENT.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted">Stock and SKUs for this pharmacy floor.</p>
          </div>
        ) : (
          <div
            className="inline-flex w-fit overflow-hidden rounded-lg border border-line"
            role="tablist"
            aria-label="Inventory view"
          >
            {(
              [
                'floor',
                'qc',
                'returns',
                'catalogue',
                'transfers',
                'adjustments',
                'stocktake',
                'controlled',
                'guidance',
              ] as const
            ).map((mode, index) => (
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
                {VIEW_COPY[mode].tab}
              </button>
            ))}
          </div>
        )}
      </header>
    </Reveal>
  );
}
