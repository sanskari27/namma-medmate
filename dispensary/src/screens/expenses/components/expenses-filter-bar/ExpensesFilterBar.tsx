import { Input, Label } from '@atoms';
import type { ExpenseCategory } from '@/services/expenses';
import type { OutletScope, SpendState } from '../../ExpensesScreen.utils';

export type ExpensesFilterBarProps = {
  categories: ExpenseCategory[];
  owner: boolean;
  categoryId: string;
  from: string;
  to: string;
  scope: OutletScope;
  spendState: SpendState;
  onCategory: (value: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onScope: (value: OutletScope) => void;
  onSpendState: (value: SpendState) => void;
};

export function ExpensesFilterBar({
  categories,
  owner,
  categoryId,
  from,
  to,
  scope,
  spendState,
  onCategory,
  onFrom,
  onTo,
  onScope,
  onSpendState,
}: ExpensesFilterBarProps) {
  return (
    <div className="grid gap-3 border border-line bg-surface px-3 py-2 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1">
        <Label htmlFor="spend-filter-state">Spend state</Label>
        <select
          id="spend-filter-state"
          className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
          value={spendState}
          onChange={(event) => onSpendState(event.target.value as SpendState)}
        >
          <option value="POSTED">On the books</option>
          <option value="PENDING">Waiting</option>
          <option value="REJECTED">Turned down</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="spend-filter-category">Category</Label>
        <select
          id="spend-filter-category"
          className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
          value={categoryId}
          onChange={(event) => onCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="spend-filter-from">From</Label>
        <Input
          id="spend-filter-from"
          type="date"
          value={from}
          onChange={(event) => onFrom(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="spend-filter-to">To</Label>
        <Input
          id="spend-filter-to"
          type="date"
          value={to}
          onChange={(event) => onTo(event.target.value)}
        />
      </div>
      {owner ? (
        <div className="space-y-1">
          <Label htmlFor="spend-filter-outlet">Outlet</Label>
          <select
            id="spend-filter-outlet"
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={scope}
            onChange={(event) => onScope(event.target.value as OutletScope)}
          >
            <option value="session">This outlet</option>
            <option value="tenant">All outlets</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}
