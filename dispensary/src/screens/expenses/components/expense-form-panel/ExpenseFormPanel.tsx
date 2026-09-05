import { Button, Input, Label } from '@atoms';
import type { ExpenseCategory } from '@/services/expenses';
import type { ShopExpense } from '@/services/expenses';
import type { FormState } from '../../ExpensesScreen.utils';

export type ExpenseFormPanelProps = {
  form: FormState;
  categories: ExpenseCategory[];
  creating: boolean;
  selected: ShopExpense | null;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onSave: () => void;
  onAddCategory: () => void;
};

export function ExpenseFormPanel({
  form,
  categories,
  creating,
  selected,
  busy,
  onChange,
  onSave,
  onAddCategory,
}: ExpenseFormPanelProps) {
  return (
    <form
      className="flex min-h-0 flex-col gap-4 border border-line bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Spend details</legend>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="spend-category">Spend category</Label>
          <select
            id="spend-category"
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={form.categoryId}
            onChange={(event) => onChange({ categoryId: event.target.value })}
          >
            <option value="">Pick a category</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="spend-amount">Amount (₹)</Label>
          <Input
            id="spend-amount"
            inputMode="decimal"
            className="font-mono"
            value={form.amountRupees}
            onChange={(event) => onChange({ amountRupees: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="spend-occurred">Occurred on</Label>
          <Input
            id="spend-occurred"
            type="date"
            value={form.occurredOn}
            onChange={(event) => onChange({ occurredOn: event.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="spend-notes">Notes</Label>
          <Input
            id="spend-notes"
            value={form.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="spend-receipt">Receipt (optional)</Label>
          <Input
            id="spend-receipt"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => onChange({ evidence: event.target.files?.[0] ?? null })}
          />
        </div>
      </fieldset>
      <fieldset className="grid gap-3 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_auto]">
        <legend className="text-sm font-medium text-ink">Add a category</legend>
        <div className="space-y-1">
          <Label htmlFor="spend-new-code">Code</Label>
          <Input
            id="spend-new-code"
            className="font-mono"
            value={form.newCode}
            onChange={(event) => onChange({ newCode: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="spend-new-label">Name</Label>
          <Input
            id="spend-new-label"
            value={form.newLabel}
            onChange={(event) => onChange({ newLabel: event.target.value })}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" disabled={busy} onClick={onAddCategory}>
            Add a category
          </Button>
        </div>
      </fieldset>
      <div className="mt-auto flex justify-end">
        <Button type="submit" disabled={busy}>
          {creating ? 'Save this spend' : 'Update this spend'}
        </Button>
      </div>
      {selected?.currentEvidenceId ? (
        <p className="text-xs text-muted">Receipt on file for this spend.</p>
      ) : null}
    </form>
  );
}
