import { Input, Label } from '@atoms';
import type { FormState } from '../../InventoryScreen.utils';

export type InventoryOpsFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function InventoryOpsFields({ formId, form, onChange }: InventoryOpsFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Ops and tracking</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-rack`}>Rack location</Label>
          <Input
            id={`${formId}-rack`}
            value={form.rackLocation}
            onChange={(e) => onChange('rackLocation', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-storage`}>Storage conditions</Label>
          <Input
            id={`${formId}-storage`}
            value={form.storageConditions}
            onChange={(e) => onChange('storageConditions', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-reorder-level`}>Reorder level</Label>
          <Input
            id={`${formId}-reorder-level`}
            value={form.reorderLevel}
            onChange={(e) => onChange('reorderLevel', e.target.value)}
            inputMode="numeric"
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-reorder-qty`}>Reorder quantity</Label>
          <Input
            id={`${formId}-reorder-qty`}
            value={form.reorderQuantity}
            onChange={(e) => onChange('reorderQuantity', e.target.value)}
            inputMode="numeric"
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-min-stock`}>Minimum stock</Label>
          <Input
            id={`${formId}-min-stock`}
            value={form.minimumStock}
            onChange={(e) => onChange('minimumStock', e.target.value)}
            inputMode="numeric"
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-notes`}>Notes</Label>
          <Input
            id={`${formId}-notes`}
            value={form.notes}
            onChange={(e) => onChange('notes', e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.requiresColdStorage}
            onChange={(e) => onChange('requiresColdStorage', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Cold storage
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.requiresBatchTracking}
            onChange={(e) => onChange('requiresBatchTracking', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Batch tracking
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.requiresExpiryTracking}
            onChange={(e) => onChange('requiresExpiryTracking', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Expiry tracking
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.requiresSerialTracking}
            onChange={(e) => onChange('requiresSerialTracking', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Serial tracking
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.controlledSubstance}
            onChange={(e) => onChange('controlledSubstance', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Controlled substance
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isDiscontinued}
            onChange={(e) => onChange('isDiscontinued', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Discontinued (keep in list)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => onChange('isActive', e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Active
        </label>
      </div>
    </div>
  );
}
