import { Input, Label } from '@atoms';
import type { FormState } from '../../DistributorsScreen.utils';

export type DistributorAddressFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function DistributorAddressFields({
  formId,
  form,
  onChange,
}: DistributorAddressFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Address</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-addr1`}>Address line 1</Label>
          <Input
            id={`${formId}-addr1`}
            value={form.addressLine1}
            onChange={(e) => onChange('addressLine1', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-addr2`}>Address line 2</Label>
          <Input
            id={`${formId}-addr2`}
            value={form.addressLine2}
            onChange={(e) => onChange('addressLine2', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-city`}>City</Label>
          <Input
            id={`${formId}-city`}
            value={form.city}
            onChange={(e) => onChange('city', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-state`}>State</Label>
          <Input
            id={`${formId}-state`}
            value={form.state}
            onChange={(e) => onChange('state', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-pin`}>PIN code</Label>
          <Input
            id={`${formId}-pin`}
            value={form.pincode}
            onChange={(e) => onChange('pincode', e.target.value)}
            required
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-country`}>Country</Label>
          <Input
            id={`${formId}-country`}
            value={form.country}
            onChange={(e) => onChange('country', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
