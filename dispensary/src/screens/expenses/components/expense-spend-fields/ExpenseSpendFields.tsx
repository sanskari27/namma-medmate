import { Input, Label } from '@atoms';
import type { ExpenseCategory } from '@/services/expenses';
import type { FormState } from '../../ExpensesScreen.utils';

export type ExpenseSpendFieldsProps = {
  form: FormState;
  categories: ExpenseCategory[];
  onChange: (patch: Partial<FormState>) => void;
};

export function ExpenseSpendFields({ form, categories, onChange }: ExpenseSpendFieldsProps) {
  return (
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
  );
}
