import { Button, Input, Label } from '@atoms';
import type { Manufacturer } from '@/services/manufacturers';
import type { ProductCategory } from '@/services/productCategories';
import {
  DOSAGE_FORMS,
  PRODUCT_ROUTES,
  PRODUCT_TYPES,
  SCHEDULES,
  type FormState,
} from '../../InventoryScreen.utils';

export type InventoryClassificationFieldsProps = {
  formId: string;
  form: FormState;
  categories: ProductCategory[];
  manufacturers: Manufacturer[];
  newCategoryName: string;
  newManufacturerName: string;
  categoryBusy: boolean;
  manufacturerBusy: boolean;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onNewCategoryNameChange: (value: string) => void;
  onNewManufacturerNameChange: (value: string) => void;
  onCreateCategory: () => void;
  onCreateManufacturer: () => void;
};

const selectClass = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink';

export function InventoryClassificationFields({
  formId,
  form,
  categories,
  manufacturers,
  newCategoryName,
  newManufacturerName,
  categoryBusy,
  manufacturerBusy,
  onChange,
  onNewCategoryNameChange,
  onNewManufacturerNameChange,
  onCreateCategory,
  onCreateManufacturer,
}: InventoryClassificationFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Classification</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-category`}>Category</Label>
          <select
            id={`${formId}-category`}
            className={selectClass}
            value={form.categoryId}
            onChange={(e) => onChange('categoryId', e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="mt-1 flex gap-2">
            <Input
              id={`${formId}-new-category`}
              value={newCategoryName}
              onChange={(e) => onNewCategoryNameChange(e.target.value)}
              placeholder="New category name"
              aria-label="New category name"
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={categoryBusy || !newCategoryName.trim()}
              onClick={onCreateCategory}
            >
              Add category
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-manufacturer`}>Manufacturer</Label>
          <select
            id={`${formId}-manufacturer`}
            className={selectClass}
            value={form.manufacturerId}
            onChange={(e) => onChange('manufacturerId', e.target.value)}
          >
            <option value="">None</option>
            {manufacturers.map((mfr) => (
              <option key={mfr.id} value={mfr.id}>
                {mfr.name}
              </option>
            ))}
          </select>
          <div className="mt-1 flex gap-2">
            <Input
              id={`${formId}-new-manufacturer`}
              value={newManufacturerName}
              onChange={(e) => onNewManufacturerNameChange(e.target.value)}
              placeholder="New manufacturer name"
              aria-label="New manufacturer name"
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={manufacturerBusy || !newManufacturerName.trim()}
              onClick={onCreateManufacturer}
            >
              Add manufacturer
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-type`}>Product type</Label>
          <select
            id={`${formId}-type`}
            className={selectClass}
            value={form.productType}
            onChange={(e) => onChange('productType', e.target.value as FormState['productType'])}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-dosage`}>Dosage form</Label>
          <select
            id={`${formId}-dosage`}
            className={selectClass}
            value={form.dosageForm}
            onChange={(e) => onChange('dosageForm', e.target.value as FormState['dosageForm'])}
          >
            {DOSAGE_FORMS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-route`}>Route</Label>
          <select
            id={`${formId}-route`}
            className={selectClass}
            value={form.route}
            onChange={(e) => onChange('route', e.target.value)}
          >
            <option value="">None</option>
            {PRODUCT_ROUTES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-schedule`}>Schedule</Label>
          <select
            id={`${formId}-schedule`}
            className={selectClass}
            value={form.scheduleClassification}
            onChange={(e) => onChange('scheduleClassification', e.target.value)}
          >
            <option value="">None</option>
            {SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-therapeutic`}>Therapeutic class</Label>
          <Input
            id={`${formId}-therapeutic`}
            value={form.therapeuticClass}
            onChange={(e) => onChange('therapeuticClass', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-strength`}>Strength</Label>
          <Input
            id={`${formId}-strength`}
            value={form.strength}
            onChange={(e) => onChange('strength', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-composition`}>Composition</Label>
          <Input
            id={`${formId}-composition`}
            value={form.composition}
            onChange={(e) => onChange('composition', e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={form.prescriptionRequired}
            onChange={(e) => onChange('prescriptionRequired', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Prescription required
        </label>
      </div>
    </div>
  );
}
