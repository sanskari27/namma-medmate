import { Input, Label } from '@atoms';
import { SUPPLIER_TYPES, typeLabel, type FormState } from '../../DistributorsScreen.utils';

const selectClass = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink';

export type DistributorIdentityFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function DistributorIdentityFields({
  formId,
  form,
  onChange,
}: DistributorIdentityFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Identity</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-code`}>Supplier code</Label>
          <Input
            id={`${formId}-code`}
            value={form.supplierCode}
            onChange={(e) => onChange('supplierCode', e.target.value)}
            autoComplete="off"
            required
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-type`}>Type</Label>
          <select
            id={`${formId}-type`}
            className={selectClass}
            value={form.supplierType}
            onChange={(e) => onChange('supplierType', e.target.value as FormState['supplierType'])}
          >
            {SUPPLIER_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-legal`}>Legal name</Label>
          <Input
            id={`${formId}-legal`}
            value={form.legalName}
            onChange={(e) => onChange('legalName', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-trade`}>Trade name</Label>
          <Input
            id={`${formId}-trade`}
            value={form.tradeName}
            onChange={(e) => onChange('tradeName', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-gstin`}>GSTIN</Label>
          <Input
            id={`${formId}-gstin`}
            value={form.gstin}
            onChange={(e) => onChange('gstin', e.target.value)}
            className="font-mono text-sm uppercase"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-pan`}>PAN</Label>
          <Input
            id={`${formId}-pan`}
            value={form.pan}
            onChange={(e) => onChange('pan', e.target.value)}
            className="font-mono text-sm uppercase"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
