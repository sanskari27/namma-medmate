import { Label } from '@atoms';
import type { ProductUnit } from '@/services/products';

export type ProductUnitSelectProps = {
  id: string;
  label: string;
  value: ProductUnit;
  options: ProductUnit[];
  disabled?: boolean;
  onChange: (unit: ProductUnit) => void;
  hint?: string;
};

/** Shared unit picker for Inventory, POS, and later PO/GRN. */
export function ProductUnitSelect({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
  hint,
}: ProductUnitSelectProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-9 w-full rounded border border-line bg-canvas px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(event) => onChange(event.target.value as ProductUnit)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {options.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={`${id}-hint`} className="font-mono text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
