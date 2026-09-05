import { Input, Label } from '@atoms';
import type { ProductCategory } from '@/services/productCategories';
import {
  PAYMENT_TERMS,
  SUPPLIER_STATUSES,
  statusLabel,
  termsLabel,
  type FormState,
} from '../../DistributorsScreen.utils';

const selectClass = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink';

export type DistributorTermsFieldsProps = {
  formId: string;
  form: FormState;
  categories: ProductCategory[];
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function DistributorTermsFields({
  formId,
  form,
  categories,
  onChange,
}: DistributorTermsFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Terms</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-terms`}>Payment terms</Label>
          <select
            id={`${formId}-terms`}
            className={selectClass}
            value={form.paymentTerms}
            onChange={(e) => onChange('paymentTerms', e.target.value as FormState['paymentTerms'])}
          >
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term}>
                {termsLabel(term)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-status`}>Status</Label>
          <select
            id={`${formId}-status`}
            className={selectClass}
            value={form.status}
            onChange={(e) => onChange('status', e.target.value as FormState['status'])}
          >
            {SUPPLIER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-credit-days`}>Credit period (days)</Label>
          <Input
            id={`${formId}-credit-days`}
            inputMode="numeric"
            value={form.creditPeriodDays}
            onChange={(e) => onChange('creditPeriodDays', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-credit-limit`}>Credit limit (₹)</Label>
          <Input
            id={`${formId}-credit-limit`}
            inputMode="decimal"
            value={form.creditLimitRupees}
            onChange={(e) => onChange('creditLimitRupees', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <fieldset className="grid gap-1.5 sm:col-span-2">
          <legend className="text-sm font-medium text-ink">Lines they supply</legend>
          {categories.length === 0 ? (
            <p className="text-sm text-muted">
              No catalogue lines yet. Add categories in Inventory.
            </p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {categories.map((category) => {
                const checked = form.categoryIds.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-sm text-ink"
                    htmlFor={`${formId}-cat-${category.id}`}
                  >
                    <input
                      id={`${formId}-cat-${category.id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? form.categoryIds.filter((id) => id !== category.id)
                          : [...form.categoryIds, category.id];
                        onChange('categoryIds', next);
                      }}
                    />
                    {category.name}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-notes`}>Notes</Label>
          <textarea
            id={`${formId}-notes`}
            value={form.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>
    </div>
  );
}
