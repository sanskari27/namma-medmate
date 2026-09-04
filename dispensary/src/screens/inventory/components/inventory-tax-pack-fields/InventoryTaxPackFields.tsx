import { Input, Label } from '@atoms';
import { PRODUCT_UNITS, type FormState } from '../../InventoryScreen.utils';

export type InventoryTaxPackFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

const selectClass = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink';

export function InventoryTaxPackFields({ formId, form, onChange }: InventoryTaxPackFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Tax and pack</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-hsn`}>HSN code</Label>
          <Input
            id={`${formId}-hsn`}
            value={form.hsnCode}
            onChange={(e) => onChange('hsnCode', e.target.value)}
            className="font-mono text-sm"
            inputMode="numeric"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-gst`}>GST rate %</Label>
          <select
            id={`${formId}-gst`}
            className={selectClass}
            value={form.gstRate}
            onChange={(e) => onChange('gstRate', e.target.value)}
          >
            <option value="">None</option>
            {['0', '5', '12', '18', '28'].map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-tax-category`}>Tax category</Label>
          <Input
            id={`${formId}-tax-category`}
            value={form.taxCategory}
            onChange={(e) => onChange('taxCategory', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-base-unit`}>Base unit</Label>
          <select
            id={`${formId}-base-unit`}
            className={selectClass}
            value={form.baseUnit}
            onChange={(e) => onChange('baseUnit', e.target.value as FormState['baseUnit'])}
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-pack-size`}>Pack size</Label>
          <Input
            id={`${formId}-pack-size`}
            value={form.packSize}
            onChange={(e) => onChange('packSize', e.target.value)}
            inputMode="decimal"
            required
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-pack-unit`}>Pack unit</Label>
          <select
            id={`${formId}-pack-unit`}
            className={selectClass}
            value={form.packUnit}
            onChange={(e) => onChange('packUnit', e.target.value as FormState['packUnit'])}
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-pack-desc`}>Pack description</Label>
          <Input
            id={`${formId}-pack-desc`}
            value={form.packDescription}
            onChange={(e) => onChange('packDescription', e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isTaxable}
            onChange={(e) => onChange('isTaxable', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Taxable
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isReturnable}
            onChange={(e) => onChange('isReturnable', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Returnable
        </label>
      </div>
    </div>
  );
}
