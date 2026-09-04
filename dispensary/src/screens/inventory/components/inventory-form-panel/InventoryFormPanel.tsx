import { Button } from '@atoms';
import type { Manufacturer } from '@/services/manufacturers';
import type { ProductCategory } from '@/services/productCategories';
import { Package } from 'lucide-react';
import { FormEvent } from 'react';
import type { FormState } from '../../InventoryScreen.utils';
import { InventoryClassificationFields } from '../inventory-classification-fields';
import { InventoryIdentityFields } from '../inventory-identity-fields';
import { InventoryOpsFields } from '../inventory-ops-fields';
import { InventoryTaxPackFields } from '../inventory-tax-pack-fields';

export type InventoryFormPanelProps = {
  formId: string;
  statusId: string;
  mode: 'idle' | 'create' | 'edit';
  form: FormState;
  busy: boolean;
  describedByStatus: boolean;
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
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
};

export function InventoryFormPanel({
  formId,
  statusId,
  mode,
  form,
  busy,
  describedByStatus,
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
  onSave,
  onCancel,
}: InventoryFormPanelProps) {
  if (mode === 'idle') {
    return (
      <section
        aria-label="Product form"
        className="flex h-full min-h-0 flex-col border border-line bg-surface"
      >
        <div className="flex h-full flex-col items-start justify-center gap-3 px-6 py-10">
          <Package className="size-8 text-brand" aria-hidden />
          <div>
            <h2 className="font-sans text-base font-semibold text-ink">Select or add a product</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Pick a row from the list or use Add product. Barcode is stored as reference — no scan
              in this phase.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Product form"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={onSave}
        noValidate
        aria-describedby={describedByStatus ? statusId : undefined}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-sans text-base font-semibold text-ink">
              {mode === 'create' ? 'New product' : 'Edit product'}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Dense catalogue fields for this pharmacy floor.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <fieldset
          disabled={busy}
          className="panel-scroll grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-4 py-4"
        >
          <InventoryIdentityFields formId={formId} form={form} onChange={onChange} />
          <InventoryClassificationFields
            formId={formId}
            form={form}
            categories={categories}
            manufacturers={manufacturers}
            newCategoryName={newCategoryName}
            newManufacturerName={newManufacturerName}
            categoryBusy={categoryBusy}
            manufacturerBusy={manufacturerBusy}
            onChange={onChange}
            onNewCategoryNameChange={onNewCategoryNameChange}
            onNewManufacturerNameChange={onNewManufacturerNameChange}
            onCreateCategory={onCreateCategory}
            onCreateManufacturer={onCreateManufacturer}
          />
          <InventoryTaxPackFields formId={formId} form={form} onChange={onChange} />
          <InventoryOpsFields formId={formId} form={form} onChange={onChange} />
        </fieldset>

        <div className="flex shrink-0 justify-end gap-2 border-t border-line px-4 py-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save product'}
          </Button>
        </div>
      </form>
    </section>
  );
}
