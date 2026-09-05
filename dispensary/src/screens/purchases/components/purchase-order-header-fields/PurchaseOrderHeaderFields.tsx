import { Input, Label } from '@atoms';
import type { Supplier } from '@/services/suppliers';
import type { FormState } from '../../PurchasesScreen.utils';
import { PAYMENT_TERMS, supplierOptionLabel, termsLabel } from '../../PurchasesScreen.utils';

export type PurchaseOrderHeaderFieldsProps = {
  formId: string;
  form: FormState;
  suppliers: Supplier[];
  lockedSupplier: boolean;
  readOnly: boolean;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function PurchaseOrderHeaderFields({
  formId,
  form,
  suppliers,
  lockedSupplier,
  readOnly,
  onChange,
}: PurchaseOrderHeaderFieldsProps) {
  return (
    <fieldset className="grid gap-3" disabled={readOnly}>
      <legend className="text-sm font-medium text-ink">Stockist and terms</legend>
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-supplier`}>Stockist</Label>
        <select
          id={`${formId}-supplier`}
          value={form.supplierId}
          disabled={lockedSupplier || readOnly}
          onChange={(e) => onChange('supplierId', e.target.value)}
          className="h-9 border border-line bg-canvas px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <option value="">Select one stockist</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplierOptionLabel(supplier)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-delivery`}>Expected delivery</Label>
          <Input
            id={`${formId}-delivery`}
            type="date"
            value={form.expectedDeliveryDate}
            onChange={(e) => onChange('expectedDeliveryDate', e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-terms`}>Payment terms</Label>
          <select
            id={`${formId}-terms`}
            value={form.paymentTerms}
            onChange={(e) => onChange('paymentTerms', e.target.value as FormState['paymentTerms'])}
            className="h-9 border border-line bg-canvas px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            {PAYMENT_TERMS.map((terms) => (
              <option key={terms} value={terms}>
                {termsLabel(terms)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-notes`}>Counter note</Label>
        <Input
          id={`${formId}-notes`}
          value={form.notes}
          onChange={(e) => onChange('notes', e.target.value)}
        />
      </div>
    </fieldset>
  );
}
