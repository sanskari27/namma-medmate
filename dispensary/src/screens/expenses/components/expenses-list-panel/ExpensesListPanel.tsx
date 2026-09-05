import type { ShopExpense } from '@/services/expenses';
import { formatOccurredOn, formatPaise } from '../../ExpensesScreen.utils';

export type ExpensesListPanelProps = {
  items: ShopExpense[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ExpensesListPanel({ items, selectedId, onSelect }: ExpensesListPanelProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        Record the first spend from this counter.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line border border-line bg-surface">
      {items.map((row) => {
        const selected = row.id === selectedId;
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${
                selected ? 'bg-brand-soft' : 'hover:bg-canvas'
              }`}
              onClick={() => onSelect(row.id)}
            >
              <span className="font-medium text-ink">{row.categoryLabel}</span>
              <span className="font-mono text-xs text-ink">{formatPaise(row.amountPaise)}</span>
              <span className="text-xs text-muted">
                {formatOccurredOn(row.occurredOn)} · {row.branchName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
