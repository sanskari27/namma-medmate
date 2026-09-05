import { Button } from '@atoms';
import type { ExpenseCategory } from '@/services/expenses';
import type { ShopExpense } from '@/services/expenses';
import type { FormState } from '../../ExpensesScreen.utils';
import { ExpenseAddCategoryFields } from '../expense-add-category-fields';
import { ExpenseSpendFields } from '../expense-spend-fields';

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
      <ExpenseSpendFields form={form} categories={categories} onChange={onChange} />
      <ExpenseAddCategoryFields
        form={form}
        busy={busy}
        onChange={onChange}
        onAddCategory={onAddCategory}
      />
      <div className="mt-auto flex justify-end">
        <Button type="submit" disabled={busy}>
          {creating ? 'Save this spend' : 'Correct this spend'}
        </Button>
      </div>
      {selected?.currentEvidenceId ? (
        <p className="text-xs text-muted">Receipt on file for this spend.</p>
      ) : null}
    </form>
  );
}
