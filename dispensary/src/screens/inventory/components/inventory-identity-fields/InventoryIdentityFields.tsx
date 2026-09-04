import { Input, Label } from '@atoms';
import type { FormState } from '../../InventoryScreen.utils';

export type InventoryIdentityFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function InventoryIdentityFields({ formId, form, onChange }: InventoryIdentityFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Identity</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-sku`}>SKU</Label>
          <Input
            id={`${formId}-sku`}
            value={form.sku}
            onChange={(e) => onChange('sku', e.target.value)}
            autoComplete="off"
            required
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-barcode`}>Barcode</Label>
          <Input
            id={`${formId}-barcode`}
            value={form.barcode}
            onChange={(e) => onChange('barcode', e.target.value)}
            autoComplete="off"
            className="font-mono text-sm"
            placeholder="Reference only"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-name`}>Name</Label>
          <Input
            id={`${formId}-name`}
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-generic`}>Generic name</Label>
          <Input
            id={`${formId}-generic`}
            value={form.genericName}
            onChange={(e) => onChange('genericName', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-brand`}>Brand name</Label>
          <Input
            id={`${formId}-brand`}
            value={form.brandName}
            onChange={(e) => onChange('brandName', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
