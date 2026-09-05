import type { ShopExpense } from '@/services/expenses';
import {
  formatOccurredOn,
  formatPaise,
  listEmptyCopy,
  postingLabel,
  type SpendState,
} from '../../ExpensesScreen.utils';

export type ExpensesListPanelProps = {
  items: ShopExpense[];
  selectedId: string | null;
  spendState: SpendState;
  onSelect: (id: string) => void;
};

export function ExpensesListPanel({
  items,
  selectedId,
  spendState,
  onSelect,
}: ExpensesListPanelProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        {listEmptyCopy(spendState)}
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
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium text-ink">{row.categoryLabel}</span>
                <span className="text-xs text-muted">{postingLabel(row.status)}</span>
              </span>
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
