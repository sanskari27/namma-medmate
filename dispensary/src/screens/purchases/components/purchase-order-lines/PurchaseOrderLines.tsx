import { Button, Input, Label } from '@atoms';
import type { Product } from '@/services/products';
import type { LineForm } from '../../PurchasesScreen.utils';
import { emptyLine, productOptionLabel } from '../../PurchasesScreen.utils';

export type PurchaseOrderLinesProps = {
  formId: string;
  lines: LineForm[];
  products: Product[];
  readOnly: boolean;
  onChange: (lines: LineForm[]) => void;
};

export function PurchaseOrderLines({
  formId,
  lines,
  products,
  readOnly,
  onChange,
}: PurchaseOrderLinesProps) {
  function update(index: number, patch: Partial<LineForm>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  return (
    <fieldset className="grid gap-2" disabled={readOnly}>
      <legend className="text-sm font-medium text-ink">Packs on this indent</legend>
      <ul className="grid gap-2">
        {lines.map((line, index) => (
          <li
            key={`${formId}-line-${index}`}
            className="grid gap-2 border border-line px-3 py-2 sm:grid-cols-[1fr_5.5rem_6.5rem_auto]"
          >
            <div className="grid gap-1">
              <Label htmlFor={`${formId}-line-${index}-product`}>Pack</Label>
              <select
                id={`${formId}-line-${index}-product`}
                value={line.productId}
                onChange={(e) => update(index, { productId: e.target.value })}
                className="h-9 border border-line bg-canvas px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
              >
                <option value="">Select pack</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {productOptionLabel(product)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${formId}-line-${index}-qty`}>Qty</Label>
              <Input
                id={`${formId}-line-${index}-qty`}
                inputMode="decimal"
                value={line.quantity}
                onChange={(e) => update(index, { quantity: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${formId}-line-${index}-rate`}>Rate ₹</Label>
              <Input
                id={`${formId}-line-${index}-rate`}
                inputMode="decimal"
                value={line.rateRupees}
                onChange={(e) => update(index, { rateRupees: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              {readOnly || lines.length < 2 ? null : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {readOnly ? null : (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...lines, { ...emptyLine }])}
        >
          Add pack
        </Button>
      )}
    </fieldset>
  );
}
