import { Button, Input, Label } from '@atoms';
import { PRODUCT_UNITS, type FormState, type UnitRow } from '../../InventoryScreen.utils';
import { Plus, Trash2 } from 'lucide-react';

export type InventoryUnitConversionsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onUnitRowsChange: (rows: UnitRow[]) => void;
};

export function InventoryUnitConversions({
  formId,
  form,
  onChange,
  onUnitRowsChange,
}: InventoryUnitConversionsProps) {
  const updateRow = (index: number, patch: Partial<UnitRow>) => {
    onUnitRowsChange(form.unitRows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onUnitRowsChange(form.unitRows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const next = PRODUCT_UNITS.find(
      (unit) => unit !== form.baseUnit && !form.unitRows.some((row) => row.unit === unit),
    );
    if (!next) return;
    onUnitRowsChange([...form.unitRows, { unit: next, factorToBase: '1' }]);
  };

  return (
    <section className="space-y-3" aria-label="Unit conversions">
      <div>
        <h3 className="text-sm font-semibold text-ink">Sale and purchase units</h3>
        <p className="text-xs text-muted">
          Base unit is {form.baseUnit}. Add strip/box factors so tills can convert without losing
          the displayed UOM. Stock stays normalized to base.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${formId}-qty-precision`}>Quantity precision</Label>
          <Input
            id={`${formId}-qty-precision`}
            type="number"
            min={0}
            max={4}
            value={form.quantityPrecision}
            onChange={(e) => onChange('quantityPrecision', e.target.value)}
          />
        </div>
      </div>
      <ul className="space-y-2" aria-label="Conversion rows">
        {form.unitRows.length === 0 ? (
          <li className="text-sm text-muted">No alternate units yet — pack fields still apply.</li>
        ) : (
          form.unitRows.map((row, index) => (
            <li
              key={`${row.unit}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 rounded border border-line p-2"
            >
              <div className="space-y-1">
                <Label htmlFor={`${formId}-unit-${index}`}>Unit</Label>
                <select
                  id={`${formId}-unit-${index}`}
                  className="h-9 w-full rounded border border-line bg-canvas px-2 text-sm"
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value as UnitRow['unit'] })}
                >
                  {PRODUCT_UNITS.filter(
                    (unit) =>
                      unit === row.unit ||
                      (unit !== form.baseUnit &&
                        !form.unitRows.some((other, j) => j !== index && other.unit === unit)),
                  ).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${formId}-factor-${index}`}>Equals how many {form.baseUnit}</Label>
                <Input
                  id={`${formId}-factor-${index}`}
                  inputMode="decimal"
                  value={row.factorToBase}
                  onChange={(e) => updateRow(index, { factorToBase: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${row.unit} conversion`}
                onClick={() => removeRow(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))
        )}
      </ul>
      <Button type="button" variant="ghost" size="sm" onClick={addRow}>
        <Plus className="size-4" aria-hidden />
        Add unit
      </Button>
    </section>
  );
}
