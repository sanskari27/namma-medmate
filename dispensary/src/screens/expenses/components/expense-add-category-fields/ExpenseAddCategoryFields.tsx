import { Button, Input, Label } from '@atoms';
import type { FormState } from '../../ExpensesScreen.utils';

export type ExpenseAddCategoryFieldsProps = {
  form: FormState;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onAddCategory: () => void;
};

export function ExpenseAddCategoryFields({
  form,
  busy,
  onChange,
  onAddCategory,
}: ExpenseAddCategoryFieldsProps) {
  return (
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
  );
}
