import type { StockBalance } from '@/services/inventory';
import { FormEvent } from 'react';

export type FloorStockListProps = {
  balances: StockBalance[];
  selectedBalanceId: string | null;
  query: string;
  showEmptyHint: boolean;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onSelect: (balance: StockBalance) => void;
};

export function FloorStockList({
  balances,
  selectedBalanceId,
  query,
  showEmptyHint,
  onQueryChange,
  onSearch,
  onSelect,
}: FloorStockListProps) {
  return (
    <aside className="flex min-h-0 flex-col border border-line bg-surface">
      <form
        className="flex gap-2 border-b border-line p-3"
        onSubmit={onSearch}
        aria-label="Search floor stock"
      >
        <label className="sr-only" htmlFor="floor-stock-search">
          Search stock
        </label>
        <input
          id="floor-stock-search"
          className="min-w-0 flex-1 border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Name or SKU"
        />
        <button
          type="submit"
          className="border border-line bg-canvas px-3 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Search
        </button>
      </form>
      <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Floor stock lines">
        {balances.map((row) => {
          const selected = row.balanceId === selectedBalanceId;
          return (
            <li key={row.balanceId} className="border-b border-line">
              <button
                type="button"
                className={`grid w-full gap-0.5 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand ${
                  selected ? 'bg-brand-soft' : 'bg-surface hover:bg-canvas'
                }`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(row)}
              >
                <span className="text-sm font-medium text-ink">{row.productName}</span>
                <span className="font-mono text-xs text-muted">
                  {row.productSku}
                  {row.batchNumber ? ` · ${row.batchNumber}` : ''}
                </span>
                <span className="font-mono text-xs tabular-nums text-ink">
                  Qty {row.quantity}
                  {row.expiresOn ? ` · Exp ${row.expiresOn}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {showEmptyHint ? (
        <p className="border-t border-line px-3 py-2 text-sm text-muted" role="status">
          No stock lines match that search on this outlet.
        </p>
      ) : null}
    </aside>
  );
}
